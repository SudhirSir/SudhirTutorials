import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, username, type } = await req.json();

    let targetEmail = email;

    // If username is provided (like in forgot password), look up the user's email
    if (username) {
      const user = await withDbRetry(() => prisma.user.findUnique({
        where: { username },
        include: {
          studentProfile: true,
          teacherProfile: true,
        },
      }));

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const foundEmail = user.studentProfile?.email || user.teacherProfile?.email;
      if (!foundEmail) {
        return NextResponse.json({ error: 'No email address is registered on this account. Please contact administrator.' }, { status: 400 });
      }
      targetEmail = foundEmail;
    }

    if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Save/upsert OTP to DB
    await withDbRetry(() => prisma.otpVerification.upsert({
      where: { email: targetEmail },
      update: {
        otp,
        createdAt: new Date(),
        expiresAt,
      },
      create: {
        email: targetEmail,
        otp,
        expiresAt,
      },
    }));

    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@sudhirtutorials.com';

    let sentSuccessfully = false;
    let isMock = false;
    const isProd = process.env.NODE_ENV === 'production';

    const hasSmtpConfig = !!(smtpHost && smtpPort && smtpUser && smtpPass);

    if (hasSmtpConfig) {
      try {
        if (smtpHost?.includes('brevo.com') || smtpPass.startsWith('xkeysib-')) {
          // Send via Brevo direct HTTP API (Highly reliable on Vercel/serverless)
          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': smtpPass,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: {
                name: 'Sudhir Tutorials',
                email: smtpFrom
              },
              to: [
                {
                  email: targetEmail
                }
              ],
              subject: 'Sudhir Tutorials - OTP Verification Code',
              textContent: `Your verification code is ${otp}. It is valid for 15 minutes.`,
              htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #4f46e5; text-align: center;">Sudhir Tutorials</h2>
                <p>Hello,</p>
                <p>Your one-time password (OTP) verification code is:</p>
                <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="color: #6b7280; font-size: 0.85rem;">This OTP is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
              </div>`
            })
          });

          if (brevoRes.ok) {
            sentSuccessfully = true;
          } else {
            const brevoErr = await brevoRes.json();
            throw new Error(brevoErr.message || 'Brevo API Error');
          }
        } else {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: smtpPort === '465', // true for 465, false for other ports
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          const mailOptions = {
            from: smtpFrom,
            to: targetEmail,
            subject: 'Sudhir Tutorials - OTP Verification Code',
            text: `Your verification code is ${otp}. It is valid for 15 minutes.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #4f46e5; text-align: center;">Sudhir Tutorials</h2>
              <p>Hello,</p>
              <p>Your one-time password (OTP) verification code is:</p>
              <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #6b7280; font-size: 0.85rem;">This OTP is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
            </div>`,
          };

          await transporter.sendMail(mailOptions);
          sentSuccessfully = true;
        }
      } catch (err: any) {
        console.error('Error sending mail:', err);
        if (isProd) {
          return NextResponse.json({ error: `Failed to send email: ${err?.message || 'Mail Delivery Error'}` }, { status: 500 });
        }
      }
    }

    if (!sentSuccessfully) {
      if (isProd) {
        return NextResponse.json({ error: 'Mail service is not configured. Please contact administrator.' }, { status: 500 });
      }
      isMock = true;
      console.log(`[MOCK EMAIL SERVICE] OTP for ${targetEmail} is: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      isMock,
      // Provide mock OTP to client ONLY if in development environment
      mockOtp: (isMock && !isProd) ? otp : undefined,
    });
  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
  }
}
