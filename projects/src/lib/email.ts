import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 生成 4 位验证码
export function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 生成验证码邮件 HTML
function generateCodeHtml(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
          background: #f5f5f5;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .code-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
        }
        .code {
          font-size: 42px;
          font-weight: bold;
          color: white;
          letter-spacing: 12px;
          margin: 0;
        }
        .info {
          font-size: 14px;
          color: #666;
          text-align: center;
          line-height: 1.8;
        }
        .warning {
          font-size: 13px;
          color: #999;
          text-align: center;
          margin-top: 20px;
          padding: 15px;
          background: #fff8f0;
          border-radius: 8px;
        }
        .footer {
          font-size: 12px;
          color: #bbb;
          text-align: center;
          margin-top: 30px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">📧 邮箱验证码</h1>
        </div>
        <p class="info">您好，您正在注册日报账号，<br>请使用以下验证码完成注册：</p>
        <div class="code-box">
          <p class="code">${code}</p>
        </div>
        <p class="info">⏰ 验证码有效期为 <strong>1 分钟</strong>，请尽快使用</p>
        <div class="warning">⚠️ 如非本人操作，请忽略此邮件，您的账号安全不会受到影响</div>
        <div class="footer">此邮件由系统自动发送，请勿回复</div>
      </div>
    </body>
    </html>
  `;
}

// 发送验证码邮件
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"日报系统" <${process.env.SMTP_USER}>`,
      to,
      subject: '【日报】邮箱验证码',
      html: generateCodeHtml(code),
    });
    console.log(`[Email] 验证码已发送至 ${to}`);
    return true;
  } catch (err) {
    console.error('[Email] 发送失败:', err);
    return false;
  }
}
