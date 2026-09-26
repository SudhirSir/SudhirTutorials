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

    // Check SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@sudhirtutorials.com';

    let sentSuccessfully = false;
    let sendErrorMsg = '';

    const hasSmtpConfig = !!(smtpHost && smtpUser && smtpPass);

    if (hasSmtpConfig) {
      const host = req.headers.get('host') || 'sudhirtutorials.me';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const logoUrl = `${protocol}://${host}/logo.png`;

      let otpLabel = "Account Verification";
      let actionText = "Your OTP for your SUDHIR TUTORIALS Account Verification is:";

      if (type === 'PASSWORD_RESET') {
        otpLabel = "Password Reset";
        actionText = "Your OTP for your SUDHIR TUTORIALS Password Reset is:";
      } else if (type === 'EMAIL_VERIFICATION' || type === 'REGISTRATION') {
        otpLabel = "Email Verification";
        actionText = "Your OTP for your SUDHIR TUTORIALS Email Verification is:";
      }

      const emailHtml = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header with Black Background, Logo on Left, Brand Name styled like Website Homepage -->
        <table cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a1a; padding: 20px; width: 100%; border-radius: 12px 12px 0 0;">
          <tr>
            <td style="vertical-align: middle; width: 45px;">
              <img src="${logoUrl}" alt="Logo" style="max-height: 35px; border-radius: 50%; object-fit: cover; display: block;" />
            </td>
            <td style="vertical-align: middle; padding-left: 10px;">
              <span style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">
                <span style="color: #ef4444;">SUDHIR</span> <span style="color: #2563eb;">TUTORIALS</span>
              </span>
            </td>
          </tr>
        </table>
        
        <!-- Content Body -->
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Dear STian,</p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            ${actionText}
          </p>
          
          <!-- OTP Display Box in Brand Primary Color (Red) -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; font-size: 32px; font-weight: 800; color: #ffffff; background-color: #dc2626; padding: 12px 35px; border-radius: 8px; letter-spacing: 6px; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">
              ${otp}
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 10px; margin-bottom: 0;">This code will expire in 15 minutes.</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
          
          <!-- Footer / Greetings -->
          <p style="color: #4b5563; font-size: 14px; margin-bottom: 5px;">Best regards,</p>
          <p style="color: #1e3a8a; font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 5px;">SUDHIR TUTORIALS</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 0;">Ludhiana, Punjab</p>
        </div>
      </div>`;

      // 1. Try Brevo REST API if key starts with xkeysib-
      if (smtpPass?.startsWith('xkeysib-')) {
        try {
          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': smtpPass,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: { name: 'SUDHIR TUTORIALS', email: smtpFrom },
              to: [{ email: targetEmail }],
              subject: `SUDHIR TUTORIALS - ${otpLabel} Code`,
              textContent: `${actionText} ${otp}. It is valid for 15 minutes.`,
              htmlContent: emailHtml
            })
          });

          if (brevoRes.ok) {
            sentSuccessfully = true;
          } else {
            const brevoErr = await brevoRes.json();
            sendErrorMsg = brevoErr.message || brevoRes.statusText;
          }
        } catch (err: any) {
          sendErrorMsg = err?.message || 'Brevo HTTP API request failed';
        }
      }

      // 2. Try Nodemailer Transport (Nodemailer handles Gmail / Brevo SMTP / Custom SMTP)
      if (!sentSuccessfully) {
        try {
          const is465 = smtpPort === '465';
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: is465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
          });

          const mailOptions = {
            from: `"SUDHIR TUTORIALS" <${smtpFrom}>`,
            to: targetEmail,
            subject: `SUDHIR TUTORIALS - ${otpLabel} Code`,
            text: `${actionText} ${otp}. It is valid for 15 minutes.`,
            html: emailHtml,
          };

          await transporter.sendMail(mailOptions);
          sentSuccessfully = true;
        } catch (err: any) {
          sendErrorMsg = err?.message || 'SMTP Mail Delivery Failed';

          // Try alternate port (465 vs 587)
          try {
            const altPort = smtpPort === '465' ? 587 : 465;
            const transporterAlt = nodemailer.createTransport({
              host: smtpHost,
              port: altPort,
              secure: altPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 10000,
              greetingTimeout: 5000,
              socketTimeout: 10000,
            });

            await transporterAlt.sendMail({
              from: `"SUDHIR TUTORIALS" <${smtpFrom}>`,
              to: targetEmail,
              subject: `SUDHIR TUTORIALS - ${otpLabel} Code`,
              text: `${actionText} ${otp}. It is valid for 15 minutes.`,
              html: emailHtml,
            });
            sentSuccessfully = true;
          } catch (altErr: any) {
            // Keep original sendErrorMsg
          }
        }
      }
    } else {
      sendErrorMsg = 'Mail service is not configured.';
    }

    if (!sentSuccessfully) {
      let userFriendlyError = sendErrorMsg || 'Mail delivery failed. Check SMTP credentials.';
      if (sendErrorMsg.includes('535') || sendErrorMsg.includes('Invalid login')) {
        userFriendlyError = 'SMTP Authentication Failed (535). The email service password in .env (SMTP_PASS) is invalid or revoked. Please update SMTP_PASS in .env with a valid Brevo SMTP key or Gmail App Password.';
      }

      return NextResponse.json({
        error: userFriendlyError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      message: `Verification OTP has been sent to ${targetEmail}.`
    });
  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
  }
}
