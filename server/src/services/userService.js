import pool from '../config/db.js';
import { DBgetAllUsers, DBgetUserById, DBinsertUser, DBdeleteUser } from '../utils/queryUserUtils.js';
import bcrypt from "bcryptjs";
import nodemailer from 'nodemailer';
import log from '../config/log.js';
import jwt from 'jsonwebtoken';
import  emailValidator from 'deep-email-validator';
import  fs from 'fs';
import request from 'request';
import { type } from 'os';
import { faker } from '@faker-js/faker';

// export const downloadAndStoreImageSeeding = async (id, img_number, url) => {
//   try {
//     const dest = './pictures/user_' + id + '_image_' + img_number + '.jpg';
//     request(url)
//     .pipe(fs.createWriteStream(dest))
//     .on('close', () => {});
//   } catch (err) {
//     throw err;
//   }
// }

export const updateProfilePicture = async (fileId, userId) => {
  try {
    const client = await pool.connect();

    await client.query(`
        UPDATE user_files SET is_profile_pic = $1 WHERE id = $2
      `, [true, fileId]);

    await client.query(`
    UPDATE user_files SET is_profile_pic = false WHERE id != $1 AND user_id = $2
  `, [fileId, userId]);

    const result = await client.query(`
      SELECT * FROM user_files WHERE user_id = $1
    `, [userId]);

    client.release();
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getUserFiles = async (userId) => {
  try {
    console.log('get user file of id:', userId);
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM user_files WHERE user_id = $1
    `, [userId]);
    client.release();
    return result.rows;
  } catch (error) {
    throw error;
  }
};


export const deleteFile = async (id, userId) => {
  try {
    console.log('deleting file with id:', id);
    const client = await pool.connect();
    // Get the file path from the database
    const result = await client.query(`
      SELECT file_path FROM user_files WHERE id = $1
    `, [id]);
    const filePath = result.rows[0].file_path;
    // Delete the file from the filesystem
    fs.unlinkSync(filePath);
    // Delete the row from the user_files table
    await client.query(`
      DELETE FROM user_files WHERE id = $1
    `, [id]);


    // Check if there are any other files with is_profile_pic set to true
    const result2 = await client.query(`
      SELECT * FROM user_files WHERE is_profile_pic = $1 AND user_id = $2
    `, [true, userId]);
    console.log(result2.rowCount, typeof(result2.rowCount));

    if (result2.rowCount === 0) {
      console.log('gonna select a new default profile pic');
      // If there are no other files with is_profile_pic set to true, select a random file and set it as the profile picture
      const result3 = await client.query(`
        SELECT * FROM user_files WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1
      `, [userId]);
      const randomFileId = result3.rows[0].id;
      await client.query(`
        UPDATE user_files SET is_profile_pic = $1 WHERE id = $2
      `, [true, randomFileId]);
    }

    client.release();
  } catch (error) {
    throw error;
  }
};




//TODO modify the '0' and 'true' to boolean
export const saveFile = async (userId, filePath, is_profile_pic) => {
  const client = await pool.connect();

  try {
    // Check if there are any existing rows for the user
    const result = await client.query(`
      SELECT COUNT(*) as count FROM user_files
      WHERE user_id = $1`
      , [userId]);
    const count = result.rows[0].count;
    console.log(count, result.rows, typeof(count));
    // If it is the first row, set is_profile_pic to true
    if (count === '0') {
      console.log('set profile pic as true');
      is_profile_pic = 'true';
    }
    console.log(userId, filePath, is_profile_pic, typeof (is_profile_pic));
    // Update previous rows to set is_profile_pic to false
    if (is_profile_pic == 'true') {
      console.log('gonna change default profile pic');
      await client.query(`
        UPDATE user_files
        SET is_profile_pic = $1
        WHERE user_id = $2
        AND is_profile_pic = $3
        `, [false, userId, true]);
    }
    // Insert new row
    const res = await client.query(`
      INSERT INTO user_files (user_id, file_path, is_profile_pic)
      VALUES ($1, $2, $3) RETURNING *;
      `, [userId, filePath, is_profile_pic]);
    client.release();
    console.log(res, res.rows);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
};


export const isActive = async (id) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT active from users
      WHERE id = $1
    `, [id]);
    console.log(result);
    console.log(result.rows);
    client.release();
    return result;
  } catch (err) {
    throw err;
  }
}

// Get all users from the database
export const getAllUsers = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(DBgetAllUsers());
    const users = result.rows;
    client.release();
    return users;
  } catch (err) {
    throw err;
  }
};

// Get bachelors from the database
export const getBachelors = async (id) => {
  try {

    // const t = await client.query(`
    // SELECT users.*, JSON_AGG(user_files.*) as files
    // FROM users LEFT JOIN user_files ON users.id = user_files.user_id
    // WHERE users.id = $1
    // GROUP BY users.id
    //     `, [id]);


    const client = await pool.connect();
    const me = await getUserById(id);
    console.log("getBachelors", me);
    const result = await client.query(`
      SELECT users.*, SQRT(POWER(73 * ABS($2 - longitude), 2) + POWER(111 * ABS($3 - latitude), 2)) as distance, JSON_AGG(user_files.*) as files
      FROM users LEFT JOIN user_files ON users.id = user_files.user_id
      WHERE $1 != users.id
      AND SQRT(POWER(73 * ABS($2 - longitude), 2) + POWER(111 * ABS($3 - latitude), 2)) < 50
      AND users.active = true
      GROUP BY users.id
    `, [me.id, me.longitude, me.latitude]);

    var closeUsers = result.rows;

    if (["hetero", "homo"].includes(me.sex_orientation)) {
      const homo = me.sex_orientation == "homo";
      closeUsers = closeUsers.filter((user) => (homo ? user.sex === me.sex : user.sex !== me.sex) && user.sex_orientation === me.sex_orientation);
    } else {
      closeUsers = closeUsers.filter((user) => user.sex === me.sex ? user.sex_orientation !== "hetero" : user.sex_orientation !== "homo");
    }

    closeUsers.map(function (user) {
        const fameFactor = Math.max(1 - (0.02 * user.fame_rating), 0.5);
        const commonInterests = me.interests.filter(value => user.interests.includes(value));
        const interestsFactor = Math.max(1 - (0.1 * commonInterests.length), 0.5);

        const ageFactor = 1 - (Math.abs(me.age - user.age) / 100);

        user.attractivity = user.distance * fameFactor * interestsFactor * ageFactor;

        delete(user.pin);
        delete(user.email);
        delete(user.password);
        delete(user.report_count);
        return user;
    });

    closeUsers.sort((a, b) => a.attractivity - b.attractivity);

    client.release();
    return closeUsers;
  } catch (err) {
    throw err;
  }
};

// Get bachelors with filters from the database
export const getFilteredBachelors = async (id, filters) => {
  try {
    const client = await pool.connect();

    const me = await getUserById(id);
    const result = await client.query(`
        SELECT users.*, SQRT(POWER(73 * ABS($2 - longitude), 2) + POWER(111 * ABS($3 - latitude), 2)) as distance, JSON_AGG(user_files.*) as files
        FROM users LEFT JOIN user_files ON users.id = user_files.user_id
        WHERE $1 != users.id
        AND SQRT(POWER(73 * ABS($2 - longitude), 2) + POWER(111 * ABS($3 - latitude), 2)) >= $4
        AND SQRT(POWER(73 * ABS($2 - longitude), 2) + POWER(111 * ABS($3 - latitude), 2)) <= $5
        AND age >= $6
        AND age <= $7
        AND fame_rating >= $8
        AND active = true
        GROUP BY users.id
      `, [me.id, me.longitude, me.latitude, filters.min_distance, filters.max_distance, filters.min_age, filters.max_age, filters.min_fame]);

    var filteredUsers = result.rows;

    if (["hetero", "homo"].includes(me.sex_orientation)) {
      const homo = me.sex_orientation === "homo";
      filteredUsers = filteredUsers.filter((user) => (homo ? user.sex === me.sex : user.sex !== me.sex) && user.sex_orientation === me.sex_orientation);
    } else {
      filteredUsers = filteredUsers.filter((user) => user.sex === me.sex ? user.sex_orientation !== "hetero" : user.sex_orientation !== "homo");
    }

    filteredUsers = filteredUsers.filter(function (user) {
        delete(user.pin);
        delete(user.email);
        delete(user.password);
        delete(user.report_count);

        const commonInterests = me.interests.filter(value => user.interests.includes(value));
        if (commonInterests.length >= filters.min_common_interests) {
          return true;
        }
        return false;
    });

    console.log("length", filteredUsers.length);
    console.log("me", me);

    // sort by increasing distance
    filteredUsers.sort((a, b) => a.distance < b.distance);

    client.release();
    return filteredUsers;
  } catch (err) {
    throw err;
  }
};

// Get user from database where email match the paramater
export const getLogin = async (email, password) => {
  try {
    const client = await pool.connect();


    const result = await client.query(`
      SELECT *
      FROM users
      WHERE email = $1
    `, [email]);

    // If no user was found with the given email, throw an error
    if (result.rowCount === 0) {
      log.error('[userService]', 'didnt find user with that mail');
      throw new Error('Invalid email or password');
    }

    // Get the user from the result
    const id = result.rows[0].id;

    const t = await client.query(`
      SELECT users.*, JSON_AGG(user_files.*) as files
      FROM users LEFT JOIN user_files ON users.id = user_files.user_id
      WHERE users.id = $1
      GROUP BY users.id
    `, [id]);

    const user = t.rows[0];

    // check if email was verified
    if (user.active === false) {
      log.error('[userService]', 'email not verified');
      throw new Error('Email not verified');
    }
    // Compare the given password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    // If the passwords don't match, throw an error
    if (!passwordMatch) {
      log.error('[userService]', 'pass didnt match');
      throw new Error('Invalid email or password .');
    }

    // await client.query(
    //   'UPDATE users SET status = null WHERE id = $1',
    //   [user.id]
    // );

    return user;
  } catch (err) {
    throw err;
  }
};

// Get a user by their ID from the database
export const getUserById = async (id) => {
  try {
    const client = await pool.connect();

    console.log(id);
    // const result = await client.query(DBgetUserById(id));
    const result = await client.query(`
      SELECT users.*, JSON_AGG(user_files.*) as files
      FROM users LEFT JOIN user_files ON users.id = user_files.user_id
      WHERE users.id = $1
      GROUP BY users.id
    `, [id]);
    const user = result.rows[0];

    client.release();
    return user;
  } catch (err) {
    throw err;
  }
};

// Get a user by their ID from the database
export const getUserByIdProfile = async (id) => {
  try {
    log.info('[userService]', 'getUserByIdProfile:', id);
    const client = await pool.connect();
    // const result = await client.query(DBgetUserById(id));

    const result = await client.query(`
      SELECT users.*, JSON_AGG(user_files.*) as files
      FROM users LEFT JOIN user_files ON users.id = user_files.user_id
      WHERE users.id = $1
      GROUP BY users.id
    `, [id]);

    const user = result.rows[0];
    if(user.files[0] === null)
      user.files = null;
    console.log(user);
    delete(user.email);
    delete(user.password);
    delete(user.report_count);
    delete(user.pin);
    client.release();
    return user;
  } catch (err) {
    throw err;
  }
};

// Get user from database where email match the paramater
export const resendSignupEmail = async (email) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT *
      FROM users
      WHERE email = $1
    `, [email]);

    // If no user was found with the given email, throw an error
    if (result.rowCount === 0) {
      log.error('[userService]', 'didnt find user with that mail');
      throw new Error('Invalid email or password');
    }

    // const emailValidation = await isEmailValid(email);
    // if (emailValidation.valid === false) {
    //   throw new Error('Email format is invalid');
    // }

    log.info('[userService]', "generating token and sending it again");
    const user = result.rows[0];
    const accessToken = generateAccessToken(result.rows[0]);
    await sendConfirmationEmail(email, user.firstName, user.lastName, accessToken);
    log.info(("email resend to", email));
  } catch (err) {
    throw err;
  } finally {
      client.release();
  }
}

const sendResetPIN = async (email, firstName, lastName, id) => {
  const transporter = nodemailer.createTransport(
    {
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
      }
    }
  );

  const pin = Math.floor(Math.random() * 9999);
  // send mail with defined transport object
  await transporter.sendMail({
    from: '"Matcha" <matcha@noreply.com>',
    to: email,
    subject: "Matcha password change",
    text: "Hi " + firstName + " " + lastName + `,\n\nHere is your code to validate your new password ${pin}\n??? Matcha`,
  });

  log.info('[userService]', "Email sent to ", email);

  const result = await client.query(`
    UPDATE users SET
    pin = $1
    WHERE id = $2
    RETURNING *;
    `, [pin, id]);
};

export const resetPassword = async (oldPassword, user) => {
  try {
    log.info('[userService]', 'resetPassword');

    // Compare the given password with the hashed password in the database
    log.info('[userService]', 'old:', oldPassword);
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);

    // If the passwords don't match, throw an error
    if (!passwordMatch) {
      log.error('[userService]', 'pass didnt match');
      throw new Error('Invalid email or password .');
    } else {
      await sendResetPIN(user.email, user.first_name, user.last_name);
    }
  } catch (err) {
    throw err;
  }
};

export const validateNewPassword = async (newPassword, pin, user) => {
  try {
    log.info('[userService]', 'resetPassword');

    // Compare the given password with the hashed password in the database
    log.info('[userService]', ', new:', newPassword);

    // If the passwords don't match, throw an error
    if (pin !== user.pin) {
      throw new Error('wrong PIN');
    } else {
      const client = await pool.connect();

      var salt = bcrypt.genSaltSync(10);
      var newHash = bcrypt.hashSync(newPassword, salt);
      const result = await client.query(
        'UPDATE users \
        SET password = $1 \
        WHERE id = $2',
        [newHash, user.id]
      );

      const result2 = await client.query(' \
        UPDATE users SET \
        pin = NULL \
        WHERE id = $1 \
        RETURNING *;',
        [id]);
      client.release();
    }
  } catch (err) {
    throw err;
  }
};


function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1800s' });
}

export const sendConfirmationEmail = async (email, firstName, lastName, accessToken) => {
  const transporter = nodemailer.createTransport(
    {
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
      }
    }
  );

  // send mail with defined transport object
  await transporter.sendMail({
    from: '"Matcha" <matcha@noreply.com>',
    to: email,
    subject: "Confirm your Matcha account",
    text: "Hi " + firstName + " " + lastName + `,\n\nIn order to get full access to Matcha features, you need to confirm your email address by following the link below.\nhttp://localhost:3000/profile?token=${accessToken}\n??? Matcha`,
  });

  log.info('[userService]', "Email sent to ", email);
};

const isEmailValid = async (email) => {
  return emailValidator.validate(email)
}

// Insert a new user into the database
export const insertUser = async (firstName, lastName, email, password, longitude, latitude) => {
  try {
    const client = await pool.connect();
    const dupplicateEmailResult = await client.query(`
      SELECT *
      FROM users
      WHERE email = $1
    `, [email]);

    if (dupplicateEmailResult.rowCount > 0)
      throw new Error('A user with the given email already exists');

    // const emailValidation = await isEmailValid(email);
    // if (emailValidation.valid === false) {
    //   console.log(emailValidation)
    //   throw new Error('Email format is invalid');
    // }

    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);

    log.info('[userService]', 'gonna insert the user');
    const result = await client.query(DBinsertUser(firstName, lastName, email, hash, longitude, latitude));
    log.info('[userService]', JSON.stringify(result.rows[0], null,2));
    const user = result.rows[0];
    const accessToken = generateAccessToken(result.rows[0]);
    await sendConfirmationEmail(email, firstName, lastName, accessToken);
    client.release();
    return user;
  } catch (err) {
    throw err;
  }
};

export const updateUserFameRating = async (id, bool) => {try {
  const client = await pool.connect();
  const user = await getUserById(id);
  var newFame = user.fame_rating;
  if (bool === true) {
    newFame++
  } else {
    newFame--;
  }
  log.info('[userService]', 'gonna update the fame_rating user');
  const result = await client.query(`
  UPDATE users SET
  fame_rating = $1
  WHERE id = $2
  RETURNING *;`, [
    newFame,
    id
  ]);
  const newUser = result.rows[0];
  console.log(newUser);
  client.release();
  return newUser;
} catch (err) {
  log.error('[userService]', err);
  throw err;
}
};

// Update user in db
export const updateUser = async (data) => {
  try {
    const client = await pool.connect();

    log.info(data);
    var interestsStr = "[";
    for (let i = 0; i < data.interests.length; i++) {
      interestsStr += "\"" + data.interests[i] + "\",";
    }
    if (interestsStr !== "[") {
      interestsStr = interestsStr.slice(0, -1);
    }
    interestsStr += "]";
    log.info('[userService]', 'gonna update the user');
    const result = await client.query(`
      UPDATE users SET
      first_name = $1,
      last_name = $2,
      email = $3,
      password = $4,
      age = $5,
      sex = $6,
      sex_orientation = $7,
      city = $8,
      country = $9,
      interests = $10,
      bio = $11,
      active = $12,
      report_count = $13
      WHERE id = $14
      RETURNING *;`, [
      data.first_name,
      data.last_name,
      data.email,
      data.password,
      data.age,
      data.sex,
      data.sex_orientation,
      data.city,
      data.country,
      interestsStr,
      data.bio,
      data.active,
      data.report_count,
      data.id
    ]);

    const resultUpdate = await client.query(`
      SELECT users.*, JSON_AGG(user_files.*) as files
      FROM users LEFT JOIN user_files ON users.id = user_files.user_id
      WHERE users.id = $1
      GROUP BY users.id
    `, [data.id]);

    const user = resultUpdate.rows[0];

    client.release();
    return user;
  } catch (err) {
    log.error('[userService]', err);
    throw err;
  }
};


const downloadFile = async (url, fileName) => {
  return new Promise((resolve, reject) => {
    request.head(url, (err, res, body) => {
      if (err) {
        reject(err);
      }

      request(url)
        .pipe(fs.createWriteStream(`uploads/${fileName}`))
        .on("close", () => {
          console.log("File saved");
          resolve();
        });
    });
  });
};

// Insert a new user into the database
export const CreateFakeUser = async (fakeUser, longitude, latitude) => {
  try {
    const client = await pool.connect();

    var salt = bcrypt.genSaltSync(10);
    var fakeHash = bcrypt.hashSync(fakeUser, salt);

    log.info('[userService]', 'gonna insert the fake user');
    const fakeMail = fakeUser + "@" + fakeUser + ".com" ;
    const res = await client.query(`
      INSERT INTO users (first_name, last_name, email, password, age, sex, sex_orientation, city, country, interests, bio, active, fame_rating, report_count, longitude, latitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `, [fakeUser, fakeUser, fakeMail, fakeHash, 20, "male", "hetero", "Paris", "France", '["test_interets"]', fakeUser, true, 0, 0, longitude, latitude]);
    log.info('[userService]', JSON.stringify(res.rows[0], null,2));

    const seed_profile_avatar = faker.image.imageUrl(480, 480, 'man,boy,male') // 'https://loremflickr.com/1234/2345/cat'
    const url = seed_profile_avatar;
    const fileName = 'fake_profile_pic_' + res.rows[0].id;


    await downloadFile(url, fileName);
    await client.query(`INSERT INTO user_files (user_id, file_path, is_profile_pic) VALUES ($1, $2, $3) RETURNING *;`, [ res.rows[0].id, 'uploads/'+fileName, true]);

    const t = await client.query(`
    SELECT users.*, JSON_AGG(user_files.*) as files
    FROM users LEFT JOIN user_files ON users.id = user_files.user_id
    WHERE users.id = $1
    GROUP BY users.id
        `, [res.rows[0].id]);

    client.release();
    return t.rows[0];
  } catch (err) {
    log.error('[userService]', err);
    throw err;
  }
};

// Delete a user from the database
export const deleteUser = async (id) => {
  try {
    const client = await pool.connect();
    await client.query(DBdeleteUser(id));
    client.release();
  } catch (err) {
    throw err;
  }
};


// update status in user
export const updateStatusUser = async (id, status) => {
  try {
    const client = await pool.connect();

    log.info('[userService]', id, status);
    log.info('[userService]', 'gonna update user status/time connected');
    if (status === false) {
      log.info('[userService]', "set to now()");
      const result = await client.query(`
        UPDATE users SET
        status = NOW()
        WHERE id = $1
        RETURNING *;`, [
          id
      ]);
      const user = result.rows[0];

      client.release();
      return user;
    } else if (status === true) {
      log.info('[userService]', "set to null");
      const result = await client.query(`
      UPDATE users SET
      status = NULL
      WHERE id = $1
      RETURNING *;`, [
        id
    ]);
    const user = result.rows[0];

    client.release();
    return user;
  }
    throw new Error("wrong value for status");;
  } catch (err) {
    log.error('[userService]', err);
    throw err;
  }
};

export const getLikedUsers = async (id) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, first_name FROM users
      WHERE id IN (
        SELECT receiver_id FROM relations
        WHERE sender_id = $1 AND type = 'like'
      )
    `, [id]);
    const users = result.rows;
    client.release();
    return users;
  } catch (err) {
    throw err;
  }
}

export const getMatchedUsers = async (id) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM users
      WHERE id IN (
        SELECT receiver_id FROM relations
        WHERE sender_id = $1 AND type = 'match'
      )
    `, [id]);
    const users = result.rows;
    client.release();
    return users;
  } catch (err) {
    throw err;
  }
}

export const getBlockedUsers = async (id) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM users
      WHERE id IN (
        SELECT receiver_id FROM relations
        WHERE sender_id = $1 AND type = 'block'
      )
    `, [id]);
    const users = result.rows;
    client.release();
    return users;
  } catch (err) {
    throw err;
  }
}
