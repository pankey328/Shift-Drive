const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const { sendMail, generateOtp } = require("../utils/sendMail");

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "default_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

// LOGIN SERVICE
const loginUser = async ({ email, password }) => {
  const userExist = await userRepository.findUserByEmail(email);

  if (!userExist) {
    const error = new Error("No Data Found");
    error.statusCode = 404;
    throw error;
  }

  if (userExist.provider === "google") {
    const error = new Error("Please login using Google");
    error.statusCode = 400;
    throw error;
  }

  if (userExist.isVerified === false) {
    const error = new Error("Please verify your account before logging in");
    error.statusCode = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, userExist.password);
  if (!isMatch) {
    const error = new Error("Password is wrong");
    error.statusCode = 400;
    throw error;
  }

  const token = generateToken(userExist);

  return {
    message: "Login Successfull",
    token,
    user: {
      id: userExist.userId,
      name: userExist.name,
      email: userExist.email,
      role: userExist.role,
    },
  };
};

// GOOGLE LOGIN SERVICE
const googleLogin = async ({ name, email, photo, uid }) => {
  let user = await userRepository.findUserByEmail(email);

  if (!user) {
    user = await userRepository.createGoogleUser({
      name,
      email,
      role: "CUSTOMER",
      googleId: uid,
      photo,
    });
  }

  const token = generateToken(user);

  return {
    message: "Google login successful",
    token,
    user: {
      id: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo,
    },
  };
};

// SEND OTP (SIGNUP) SERVICE
const sendOtp = async ({ name, email, password, role }) => {
  const userExist = await userRepository.findUserByEmail(email);

  if (userExist && userExist.isVerified) {
    const error = new Error("User already exists");
    error.statusCode = 400;
    throw error;
  }

  const otp = generateOtp();
  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedOtp = await bcrypt.hash(otp.toString(), 10);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  const pendingUser = await userRepository.upsertUserOtp({
    name,
    email,
    password: hashedPassword,
    role: role || "CUSTOMER",
    otp: hashedOtp,
    otpExpiry,
  });

  const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Verification</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 30px 40px; border-bottom: 1px solid #f3f4f6;">
                    <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      ShiftDrive <span style="color: #2563eb; font-weight: 500; font-style: italic;">App</span>
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Status Badge -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; padding: 8px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                        Authentication Code
                      </span>
                    </div>

                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      Hello,
                    </p>
                    
                    <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      We received a request to access your account. Please use the secure verification code below to complete your login process:
                    </p>

                    <!-- Highlighted OTP Box -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 48px;">
                        <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0f172a; margin-left: 12px; font-family: monospace;">
                          ${otp}
                        </span>
                      </div>
                    </div>

                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 24px; text-align: center;">
                      This code is valid for <strong style="color: #e11d48;">5 minutes</strong>.
                    </p>

                    <div style="border-top: 1px solid #e5e7eb; margin: 30px 0;"></div>

                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 22px;">
                      If you didn't attempt to log in or request this code, please ignore this email or contact support immediately to secure your account.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                      &copy; ${new Date().getFullYear()} ShiftDrive Mobility. All rights reserved.
                      <br><br>
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

  try {
    await sendMail(email, "Signup OTP", htmlTemplate);
    return { message: "OTP sent successfully" };
  } catch (err) {
    console.error("Nodemailer Error:", err);

    await userRepository.updateUserOtp(pendingUser, null, null);

    const mailError = new Error("Failed to send email, please try again");
    mailError.statusCode = 500;
    throw mailError;
  }
};

// VERIFY OTP (SIGNUP) SERVICE
const verifyOtp = async ({ email, otp }) => {
  const pendingUser = await userRepository.findUserByEmail(email);

  if (!pendingUser) {
    const error = new Error("OTP not found");
    error.statusCode = 404;
    throw error;
  }

  if (pendingUser.isVerified) {
    const error = new Error("User already verified");
    error.statusCode = 400;
    throw error;
  }

  if (
    !pendingUser.otp ||
    !pendingUser.otpExpiry ||
    pendingUser.otpExpiry < Date.now()
  ) {
    const error = new Error("Invalid or Expired OTP");
    error.statusCode = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(otp.toString(), pendingUser.otp);
  if (!isMatch) {
    const error = new Error("Invalid or Expired OTP");
    error.statusCode = 400;
    throw error;
  }

  pendingUser.isVerified = true;
  pendingUser.otp = null;
  pendingUser.otpExpiry = null;

  const verifiedUser = await userRepository.markUserAsVerified(pendingUser);

  return {
    message: "Registration Successful",
    user: {
      id: verifiedUser.userId,
      name: verifiedUser.name,
      email: verifiedUser.email,
      role: verifiedUser.role,
    },
  };
};

// FORGET PASSWORD SERVICE
const forgetPassword = async ({ email }) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp.toString(), 10);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  await userRepository.updateUserOtp(user, hashedOtp, otpExpiry);

  const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Code</title>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 30px 40px; border-bottom: 1px solid #f3f4f6;">
                    <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      ShiftDrive <span style="color: #2563eb; font-weight: 500; font-style: italic;">App</span>
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Status Badge (Purple for Password Reset) -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <span style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; padding: 8px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                        Password Reset
                      </span>
                    </div>

                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      Hello,
                    </p>
                    
                    <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      You requested a One-Time Password (OTP) to log in to your account. Please use the code below to proceed:
                    </p>

                    <!-- Highlighted OTP Box -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 48px;">
                        <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0f172a; margin-left: 12px; font-family: monospace;">
                          ${otp}
                        </span>
                      </div>
                    </div>

                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 24px; text-align: center;">
                      This code is valid for <strong style="color: #e11d48;">5 minutes</strong>.
                    </p>

                    <div style="border-top: 1px solid #e5e7eb; margin: 30px 0;"></div>

                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 22px;">
                      If you did not request this code, please ignore this email or contact support if you have concerns.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                      &copy; ${new Date().getFullYear()} ShiftDrive Mobility. All rights reserved.
                      <br><br>
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

  try {
    await sendMail(email, "Forgot Password OTP", htmlTemplate);
    return { message: "OTP sent successfully" };
  } catch (err) {
    console.error("Nodemailer Error:", err);

    await userRepository.updateUserOtp(user, null, null);

    const mailError = new Error("Failed to send email, please try again");
    mailError.statusCode = 500;
    throw mailError;
  }
};

// VERIFY FORGET PASSWORD SERVICE
const verifyForgetPassword = async ({
  email,
  otp,
  newpassword,
  confirmpassword,
}) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.otp || !user.otpExpiry) {
    const error = new Error("OTP not generated");
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > user.otpExpiry) {
    const error = new Error("OTP expired");
    error.statusCode = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(otp.toString(), user.otp);
  if (!isMatch) {
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    throw error;
  }

  if (newpassword !== confirmpassword) {
    const error = new Error("NewPassword & ConfirmPassword must be same");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newpassword, 10);
  await userRepository.updateUserPassword(user, hashedPassword);

  return { message: "Password reset successfully" };
};

// RESET PASSWORD SERVICE
const resetPassword = async ({
  email,
  password,
  newpassword,
  confirmpassword,
}) => {
  const existUser = await userRepository.findUserByEmail(email);
  if (!existUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatched = await bcrypt.compare(password, existUser.password);
  if (!isMatched) {
    const error = new Error("Password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const isSamePassword = await bcrypt.compare(newpassword, existUser.password);
  if (isSamePassword) {
    const error = new Error("New password cannot be same as old password");
    error.statusCode = 400;
    throw error;
  }

  if (newpassword !== confirmpassword) {
    const error = new Error("New Password and Confirm Password do not match");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newpassword, 10);
  await userRepository.updateUserPassword(existUser, hashedPassword);

  return { message: "Password changed successfully" };
};

const getUserProfile = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

module.exports = {
  loginUser,
  googleLogin,
  sendOtp,
  verifyOtp,
  forgetPassword,
  verifyForgetPassword,
  resetPassword,
  getUserProfile,
};
