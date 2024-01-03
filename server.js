const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const PORT = 8081;
const app = express();
app.use(cors());
app.use(express.json()); 
const timestamp = new Date();

const db = mysql.createConnection({
  database: 'resume_wizard',
  user: 'root',
  password: '',
  host: 'localhost',
  multipleStatements: true, 
});

app.listen(PORT, () => {
  console.log(`[server] Server initiated at port:${PORT}`);

  db.connect((err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("[db] MySQL database connected");
    }
  });
});

app.post('/resume_wizard', async (req, res) => {
  const {
    UserID, Username, Password, Email, ResumeID, Title, DateCreated, Degree, School,
    GraduationYear, ProjectName, Description, ProjectStartDate, ProjectEndDate, CertificationID, CertificationName, Issuer,
     Position, Company, StartDate, EndDate,SkillName, Proficiency, LanguageName, LanguageProficiency
  } = req.body;

  console.log(UserID, Username, Password, Email, ResumeID, Title, DateCreated,  Degree, School,
    GraduationYear, ProjectName, Description, ProjectStartDate, ProjectEndDate, CertificationID, CertificationName, Issuer,
     Position, Company, StartDate, EndDate, SkillName, Proficiency,LanguageName, LanguageProficiency);
     
     const logQuery = `
     INSERT INTO ResumeWizardLog (
       UserID, ResumeID, Action, DateCreated,
       Username, Password, Email,
       Title, Degree, School, GraduationYear,
       ProjectName, Description, ProjectStartDate, ProjectEndDate,
       CertificationID, CertificationName, Issuer,
       Position, Company, StartDate, EndDate,
       SkillName, Proficiency,
       LanguageName, LanguageProficiency
     ) 
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `;
  const sq = "INSERT INTO Users (UserID, Username, Password, Email) VALUES (?,?,?,?)";
  const sq2 = "INSERT INTO Resumes (ResumeID,UserID, Title, DateCreated) VALUES (?,?,?,NOW())";
  const sq3 = "INSERT INTO Education (ResumeID, Degree, School, GraduationYear) VALUES (?,?,?,?)";
  const sq4 = "INSERT INTO Projects (ResumeID, ProjectName, Description, StartDate, EndDate) VALUES (?,?,?,?,?)";
  const sq5 = "INSERT INTO Certifications(CertificationID,ResumeID, CertificationName, Issuer) VALUES (?,?,?,?)";
  const sq6 = "INSERT INTO Experience (ResumeID, Position, Company, StartDate, EndDate) VALUES (?,?,?,?,?)";
  const sq7 = "INSERT INTO Skills (ResumeID, SkillName, Proficiency) VALUES (?,?,?)";
  const sq8 = "INSERT INTO Languages (ResumeID,LanguageName,  Proficiency) VALUES (?,?,?)";

  try {
    db.beginTransaction();

    db.query(sq, [UserID, Username, Password, Email], handleQueryResult);
    db.query(sq2, [ResumeID,UserID,Title, DateCreated], handleQueryResult);
    db.query(sq3, [ResumeID, Degree, School, GraduationYear], handleQueryResult);
    db.query(sq4, [ResumeID, ProjectName, Description, ProjectStartDate, ProjectEndDate], handleQueryResult);
    db.query(sq5, [CertificationID,ResumeID, CertificationName, Issuer], handleQueryResult);
    db.query(sq6, [ResumeID ,Position, Company, StartDate, EndDate], handleQueryResult);
    db.query(sq7, [ResumeID,SkillName, Proficiency], handleQueryResult);
    db.query(sq8, [ResumeID, LanguageName, LanguageProficiency], handleQueryResult);
    db.query(logQuery, [
      UserID, ResumeID, 'Resume Wizard Completed',
      Username, Password, Email,
      Title, Degree, School, GraduationYear,
      ProjectName, Description, ProjectStartDate, ProjectEndDate,
      CertificationID, CertificationName, Issuer,
      Position, Company, StartDate, EndDate,
      SkillName, Proficiency,
      LanguageName, LanguageProficiency
    ], handleQueryResult);
    db.commit();
    res.status(200).json({ status: 200, msg: `User and resume details inserted successfully` });
  } catch (error) {
    db.rollback();
    console.error('Transaction error:', error);
    res.status(500).json({ status: 500, msg: `Internal server error: ${error.message}` });
  }

  function handleQueryResult(err, result, fields) {
    if (err) {
      db.rollback();
      console.error('Query error:', err);
      res.status(500).json({ status: 500, msg: `Error inserting data: ${err.message}` });
    }
  }
});
app.get('/search_resume', async (req, res) => {
  const resumeIDToSearch = req.query.resumeID;

  console.log('Searching for resume with ID:', resumeIDToSearch);
  const s = "SELECT Users.UserID, Users.Password, Users.Email, Resumes.ResumeID, Resumes.Title, Resumes.DateCreated, Education.Degree, Education.School, Education.GraduationYear, Experience.Position, Experience.Company, Experience.StartDate, Experience.EndDate, Skills.SkillName, Skills.Proficiency, Certifications.CertificationName, Certifications.Issuer, Projects.ProjectName, Projects.Description, Projects.StartDate, Projects.EndDate,Languages.LanguageName, Languages.Proficiency FROM Users JOIN Resumes ON Users.UserID = Resumes.UserID LEFT JOIN Education ON Resumes.ResumeID = Education.ResumeID LEFT JOIN Experience ON Resumes.ResumeID = Experience.ResumeID LEFT JOIN Skills ON Resumes.ResumeID = Skills.ResumeID LEFT JOIN Certifications ON Resumes.ResumeID = Certifications.ResumeID LEFT JOIN Projects ON Resumes.ResumeID = Projects.ResumeID LEFT JOIN Languages ON Resumes.ResumeID = Languages.ResumeID WHERE Resumes.ResumeID = ?";

  db.query(s, [resumeIDToSearch], (error, result) => {
    if (error) {
      console.error('Query error:', error);
      res.status(500).json({ status: 500, msg: `Internal server error: ${error.message}` });
    } else {
      console.log('Query result:', result);

      if (result.length > 0) {
        res.status(200).json({ exists: true, resumeDetails: result[0] });
      } else {
        res.status(200).json({ exists: false });
      }
    }
  });
});
app.post('/rollback_resume', (req, res) => {
  const resumeIDToSearch = req.query.resumeID;
  const rollbackQuery = "INSERT INTO Resumes (ResumeID, UserID, Title, DateCreated) SELECT ResumeID, UserID, Title, DateCreated FROM DeletedResumesLog WHERE ResumeID = ?";
  const rollbackDeleteLogQuery = "DELETE FROM DeletedResumesLog WHERE ResumeID = ?";
  db.beginTransaction((beginTransactionError) => {
    if (beginTransactionError) {
      console.error('Transaction begin error:', beginTransactionError);
      return res.status(500).json({ success: false, msg: `Internal server error: ${beginTransactionError.message}` });
    }
    db.query(rollbackQuery, [resumeIDToSearch], (error, result) => {
      if (error) {
        console.error('Rollback query error:', error);
        return db.rollback(() => {
          res.status(500).json({ success: false, msg: 'Internal server error during rollback' });
        });
      }
      if (result.affectedRows > 0) {
        db.query(rollbackDeleteLogQuery, [resumeIDToSearch], (deleteLogError, deleteLogResult) => {
          if (deleteLogError) {
            console.error('Delete log query error:', deleteLogError);
          }
        });
        db.commit((commitError) => {
          if (commitError) {
            console.error('Transaction commit error:', commitError);
            return db.rollback(() => {
              res.status(500).json({ success: false, msg: `Internal server error: ${commitError.message}` });
            });
          }
          console.log('Transaction committed');
          res.status(200).json({ success: true, msg: 'Resume rolled back successfully' });
        });
      } else {
        console.log('No deleted resumes to roll back');
        res.status(404).json({ success: false, msg: 'No deleted resumes to roll back' });
      }
    });
  });
});

app.delete('/delete_resume', (req, res) => {
  const resumeIDToDelete = req.query.resumeID;
  const deleteQuery = "DELETE FROM Resumes WHERE ResumeID = ?";
  const insertLogQuery = "INSERT INTO DeletedResumesLog (ResumeID, UserID, Title, DateCreated) SELECT ResumeID, UserID, Title, DateCreated FROM Resumes WHERE ResumeID = ?";
  db.query(insertLogQuery, [resumeIDToDelete], (logError, logResult) => {
    if (logError) {
      console.error('Log query error:', logError);
      res.status(500).json({ success: false, msg: `Internal server error: ${logError.message}` });
    } else {
      db.query(deleteQuery, [resumeIDToDelete], (deleteError, deleteResult) => {
        if (deleteError) {
          console.error('Delete query error:', deleteError);
          res.status(500).json({ success: false, msg: `Internal server error: ${deleteError.message}` });
        } else {
          if (deleteResult.affectedRows > 0) {
            console.log(`Resume with ID ${resumeIDToDelete} deleted successfully`);
            res.status(200).json({ success: true, msg: 'Resume deleted successfully' });
          } else {
            console.log(`Resume with ID ${resumeIDToDelete} not found`);
            res.status(404).json({ success: false, msg: 'Resume not found' });
          }
        }
      });
    }
  });
});

app.post('/update_user', (req, res) => {
  const { userID, updatedUserData } = req.body;
  const updateQuery = `UPDATE Users SET Password = ?, Email = ? WHERE UserID = ?`;
  const logupdateQuery = `INSERT INTO UserUpdateLog(UserId, Username, Password, Email) SELECT UserID, Username, Password, Email FROM Users WHERE UserID = ?`;
  const { UpdatedPassword, UpdatedEmail } = updatedUserData;

  db.query(
    updateQuery,
    [UpdatedPassword, UpdatedEmail, userID],
    (error, result) => {
      if (error) {
        console.error('Query error:', error);
        res.status(500).json({
          success: false,
          msg: `Internal server error: ${error.message}`,
        });
      } else {
        if (result.affectedRows > 0) {
          db.query(logupdateQuery, [userID], (logError, logResult) => {
            if (logError) {
              console.error('Log query error:', logError);
            }
          });

          console.log(`User with ID ${userID} updated successfully`);
          res.json({ success: true, msg: 'User updated successfully' });
        } else {
          console.log(`User with ID ${userID} not found`);
          res.status(404).json({ success: false, msg: 'User not found' });
        }
      }
    }
  );
});
app.post('/rollback_updateduser', (req, res) => {
  const userIDToSearch = req.query.userID;
  const rollbackQuery = `
    INSERT INTO Users (Password, Email)
    SELECT Password, Email
    FROM UserUpdateLog
    WHERE UserID = ?
  `;
  const rollbackDeleteLogQuery = "DELETE FROM UserUpdateLog WHERE UserID = ?";

  db.beginTransaction((beginTransactionError) => {
    if (beginTransactionError) {
      console.error('Transaction begin error:', beginTransactionError);
      return res.status(500).json({ success: false, msg: `Internal server error: ${beginTransactionError.message}` });
    }

    db.query(rollbackQuery, [userIDToSearch], (error, result) => {
      if (error) {
        console.error('Rollback query error:', error);
        return db.rollback(() => {
          res.status(500).json({ success: false, msg: 'Internal server error during rollback' });
        });
      }
      
      if (result.affectedRows > 0) {
        db.query(rollbackDeleteLogQuery, [userIDToSearch], (deleteLogError, deleteLogResult) => {
          if (deleteLogError) {
            console.error('Delete log query error:', deleteLogError);
          }
        });

        db.commit((commitError) => {
          if (commitError) {
            console.error('Transaction commit error:', commitError);
            return db.rollback(() => {
              res.status(500).json({ success: false, msg: `Internal server error: ${commitError.message}` });
            });
          }

          console.log('Transaction committed');
          res.status(200).json({ success: true, msg: 'User update rolled back successfully' });
        });
      } else {
        console.log('No user updates to roll back');
        res.status(404).json({ success: false, msg: 'No user updates to roll back' });
      }
    });
  });
});

