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
        const host = req.headers.get('host') || 'sudhirtutorials.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const logoUrl = `${protocol}://${host}/logo.png`;

        const emailHtml = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header with Brand Background -->
          <div style="background-color: #1e3a8a; padding: 25px; text-align: center;">
            <img src="${logoUrl}" alt="SUDHIR TUTORIALS" style="max-height: 50px; display: inline-block;" />
          </div>
          
          <!-- Content Body -->
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 15px; text-align: center;">Email Verification</h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Dear User,</p>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
              Welcome to <strong>SUDHIR TUTORIALS</strong>! To secure your account, please verify your email address by using the One-Time Password (OTP) verification code below:
            </p>
            
            <!-- OTP Display Box in Brand Primary Color (Red) -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; font-size: 32px; font-weight: 800; color: #ffffff; background-color: #dc2626; padding: 12px 35px; border-radius: 8px; letter-spacing: 6px; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">
                ${otp}
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 10px; margin-bottom: 0;">This code will expire in 15 minutes.</p>
            </div>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
              If you did not request this verification code, please ignore this email or contact support if you have concerns.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            
            <!-- Footer / Greetings -->
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 5px;">Best regards,</p>
            <p style="color: #1e3a8a; font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 5px;">SUDHIR TUTORIALS</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 0;">Ludhiana, Punjab</p>
          </div>
        </div>`;

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
                name: 'SUDHIR TUTORIALS',
                email: smtpFrom
              },
              to: [
                {
                  email: targetEmail
                }
              ],
              subject: 'SUDHIR TUTORIALS - OTP Verification Code',
              textContent: `Your verification code is ${otp}. It is valid for 15 minutes.`,
              htmlContent: emailHtml
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
            from: `"SUDHIR TUTORIALS" <${smtpFrom}>`,
            to: targetEmail,
            subject: 'SUDHIR TUTORIALS - OTP Verification Code',
            text: `Your verification code is ${otp}. It is valid for 15 minutes.`,
            html: emailHtml,
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
