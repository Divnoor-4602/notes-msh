import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend = new Resend(components.resend, {
  testMode: false,
});

export const sendTestEmail = internalMutation({
  args: {
    userEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: args.userEmail,
      subject: "Hi there",
      html: "This is a test email",
    });
    return null;
  },
});

export const sendWelcomeEmail = internalMutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, { userEmail, userName }) => {
    // todo: update the final url on deployment
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Notes0</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .welcome-title {
              font-size: 24px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .feature-list {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .feature-item {
              display: flex;
              align-items: center;
              margin-bottom: 12px;
            }
            .feature-icon {
              width: 20px;
              height: 20px;
              margin-right: 12px;
              color: #2563eb;
            }
            .cta-button {
              display: inline-block;
              background: #2563eb !important;
              color: #ffffff !important;
              padding: 12px 24px;
              text-decoration: none !important;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              border: none;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Notes0</div>
              <h1 class="welcome-title">Welcome, ${userName}! 🎉</h1>
            </div>
            
            <div class="content">
              <p>Thank you for joining Notes0! You're now part of a community that's revolutionizing how people create, collaborate, and communicate through voice-driven diagramming.</p>
              
              <div class="feature-list">
                <h3 style="margin-top: 0; color: #1f2937;">What you can do with Notes0:</h3>
                <div class="feature-item">
                  <span class="feature-icon">🎤</span>
                  <span><strong>Voice Agent:</strong> Create diagrams by simply speaking your ideas</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🎨</span>
                  <span><strong>Collaborative Canvas:</strong> Draw and diagram with real-time collaboration</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">⚡</span>
                  <span><strong>Real-time Updates:</strong> See changes instantly as you work</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🔄</span>
                  <span><strong>AI-Powered:</strong> Intelligent diagram generation and refinement</span>
                </div>
              </div>
              
              <p>Ready to get started? Your canvas is already set up and waiting for you!</p>
              
              <div style="text-align: center;">
                <a href="${siteUrl}" class="cta-button">Start Creating</a>
              </div>
              
              <p><strong>Pro Tip:</strong> Try clicking the voice agent button in the bottom-right corner and say "Create a flowchart for user authentication" to see the magic happen!</p>
            </div>
            
            <div class="footer">
              <p>If you have any questions, feel free to reach out to us at support@notes0.app</p>
              <p>Happy diagramming!<br>The Notes0 Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: userEmail,
      subject: `Welcome to Notes0, ${userName}! 🎉`,
      html: html,
    });
  },
});

export const sendTrialStartedEmail = internalMutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    trialDays: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { userEmail, userName, trialDays }) => {
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Notes0 Pro Trial Has Started</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 20px;
              }
              .trial-badge {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin-bottom: 20px;
              }
              .cta-button {
                display: inline-block;
                background: #2563eb !important;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none !important;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                border: none;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Notes0</div>
                <h1 class="title">Your Pro Trial Has Started! 🚀</h1>
                <div class="trial-badge">${trialDays}-Day Free Trial</div>
              </div>
              
              <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Great news! Your Notes0 Pro trial has officially started. You now have access to all our premium features for the next ${trialDays} days.</p>
                
                <h3>What's included in your Pro trial:</h3>
                <ul>
                  <li>🎤 <strong>Voice Agent:</strong> Create diagrams by speaking your ideas</li>
                  <li>🎨 <strong>Collaborative Canvas:</strong> Real-time collaboration features</li>
                  <li>⚡ <strong>Real-time Updates:</strong> Instant synchronization</li>
                  <li>🔄 <strong>AI-Powered:</strong> Advanced diagram generation</li>
                </ul>
                
                <p>Ready to explore? Start creating amazing diagrams with your voice!</p>
                
                <div style="text-align: center;">
                  <a href="${siteUrl}" class="cta-button">Start Your Trial</a>
                </div>
                
                <p><strong>Pro Tip:</strong> Try saying "Create a user flow diagram for mobile app onboarding" to see the voice agent in action!</p>
              </div>
              
              <div class="footer">
                <p>Questions? Contact us at support@notes0.app</p>
                <p>Happy diagramming!<br>The Notes0 Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: userEmail,
      subject: `Your 3-Day Notes0 Pro Trial Has Started! 🚀`,
      html: html,
    });
    return null;
  },
});

export const sendTrialEndingSoonEmail = internalMutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    daysRemaining: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { userEmail, userName, daysRemaining }) => {
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Notes0 Trial Ends Soon</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 20px;
              }
              .urgent-badge {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin-bottom: 20px;
              }
              .cta-button {
                display: inline-block;
                background: #2563eb !important;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none !important;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                border: none;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Notes0</div>
                <h1 class="title">Your 3-Day Free Trial Ends Soon! ⏰</h1>
                <div class="urgent-badge">${daysRemaining} Day${
      daysRemaining === 1 ? "" : "s"
    } Remaining</div>
              </div>
              
              <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Your Notes0 Pro trial will end in ${daysRemaining} day${
      daysRemaining === 1 ? "" : "s"
    } of your 3-day free trial. Don't lose access to all the amazing features you've been enjoying!</p>
                
                <h3>Keep your Pro features:</h3>
                <ul>
                  <li>🎤 Voice Agent for hands-free diagramming</li>
                  <li>🎨 Collaborative Canvas for team work</li>
                  <li>⚡ Real-time updates and synchronization</li>
                  <li>🔄 AI-powered diagram generation</li>
                </ul>
                
                <p>Upgrade now to continue creating amazing diagrams without interruption.</p>
                
                <div style="text-align: center;">
                  <a href="${siteUrl}/pricing" class="cta-button">Upgrade to Pro</a>
                </div>
                
                <p><strong>Special Offer:</strong> Upgrade today and get your first month at a discounted rate!</p>
              </div>
              
              <div class="footer">
                <p>Questions? Contact us at support@notes0.app</p>
                <p>Don't miss out!<br>The Notes0 Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: userEmail,
      subject: `Your 3-Day Free Trial Ends in ${daysRemaining} Day${
        daysRemaining === 1 ? "" : "s"
      }! ⏰`,
      html: html,
    });
    return null;
  },
});

export const sendTrialExpiredEmail = internalMutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userEmail, userName }) => {
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Notes0 3-Day Free Trial Has Expired</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 20px;
              }
              .expired-badge {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin-bottom: 20px;
              }
              .cta-button {
                display: inline-block;
                background: #2563eb !important;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none !important;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                border: none;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Notes0</div>
                <h1 class="title">Your 3-Day Free Trial Has Expired 😔</h1>
                <div class="expired-badge">Trial Ended</div>
              </div>
              
              <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Your Notes0 Pro trial has expired. We hope you enjoyed exploring all the premium features!</p>
                
                <p>You can still use Notes0 with basic features, but you'll no longer have access to:</p>
                <ul>
                  <li>🎤 Voice Agent</li>
                  <li>🎨 Collaborative Canvas</li>
                  <li>⚡ Real-time Updates</li>
                  <li>🔄 AI-powered features</li>
                </ul>
                
                <p>Ready to get back to creating amazing diagrams? Upgrade to Pro and continue where you left off!</p>
                
                <div style="text-align: center;">
                  <a href="${siteUrl}/pricing" class="cta-button">Upgrade to Pro</a>
                </div>
                
                <p><strong>Limited Time:</strong> Get 20% off your first month when you upgrade today!</p>
              </div>
              
              <div class="footer">
                <p>Questions? Contact us at support@notes0.app</p>
                <p>We'd love to have you back!<br>The Notes0 Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: userEmail,
      subject: `Your Notes0 3-Day Free Trial Has Expired - Upgrade to Continue! 😔`,
      html: html,
    });
    return null;
  },
});

export const sendSubscriptionActivatedEmail = internalMutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    planName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userEmail, userName, planName }) => {
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Notes0 Pro</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 20px;
              }
              .success-badge {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin-bottom: 20px;
              }
              .cta-button {
                display: inline-block;
                background: #2563eb !important;
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none !important;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                border: none;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Notes0</div>
                <h1 class="title">Welcome to ${planName}! 🎉</h1>
                <div class="success-badge">Subscription Active</div>
              </div>
              
              <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Congratulations! Your Notes0 ${planName} subscription is now active. You have full access to all premium features.</p>
                
                <h3>Your Pro features are now unlocked:</h3>
                <ul>
                  <li>🎤 <strong>Voice Agent:</strong> Create diagrams by speaking your ideas</li>
                  <li>🎨 <strong>Collaborative Canvas:</strong> Work together in real-time</li>
                  <li>⚡ <strong>Real-time Updates:</strong> Instant synchronization</li>
                  <li>🔄 <strong>AI-Powered:</strong> Advanced diagram generation</li>
                </ul>
                
                <p>Thank you for choosing Notes0 Pro. We're excited to see what you'll create!</p>
                
                <div style="text-align: center;">
                  <a href="${siteUrl}" class="cta-button">Start Creating</a>
                </div>
                
                <p><strong>Need help?</strong> Check out our documentation or contact support if you have any questions.</p>
              </div>
              
              <div class="footer">
                <p>Questions? Contact us at support@notes0.app</p>
                <p>Happy diagramming!<br>The Notes0 Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: userEmail,
      subject: `Welcome to Notes0 ${planName}! 🎉`,
      html: html,
    });
    return null;
  },
});

export const sendCanvasShareEmail = internalMutation({
  args: {
    recipientEmail: v.string(),
    senderName: v.string(),
    shareUrl: v.string(),
    customMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { recipientEmail, senderName, shareUrl, customMessage }
  ) => {
    const siteUrl = process.env.SITE_URL || "https://notes0.app";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${senderName} shared a canvas with you</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .share-badge {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: inline-block;
              margin-bottom: 20px;
            }
            .message-box {
              background: #f8fafc;
              border-left: 4px solid #2563eb;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-style: italic;
            }
            .cta-button {
              display: inline-block;
              background: #2563eb !important;
              color: #ffffff !important;
              padding: 14px 28px;
              text-decoration: none !important;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              border: none;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .info-box {
              background: #f0f9ff;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Notes0</div>
              <h1 class="title">${senderName} shared a canvas with you</h1>
              <div class="share-badge">Canvas Share 🎨</div>
            </div>
            
            <div class="content">
              <p>Hi there,</p>
              
              <p><strong>${senderName}</strong> wants to share a canvas with you on Notes0!</p>
              
              ${
                customMessage
                  ? `
                <div class="message-box">
                  <strong>Message from ${senderName}:</strong><br>
                  "${customMessage}"
                </div>
              `
                  : ""
              }
              
              <div class="info-box">
                <p style="margin: 0;"><strong>What is a shared canvas?</strong></p>
                <p style="margin: 8px 0 0 0;">A canvas is a collaborative diagram created with Notes0. You can import this canvas into your account and view or edit it with our powerful diagramming tools.</p>
              </div>
              
              <p>Click the button below to view and import this canvas:</p>
              
              <div style="text-align: center;">
                <a href="${shareUrl}" class="cta-button">View & Import Canvas</a>
              </div>
              
              <p style="text-align: center; font-size: 14px; color: #6b7280;">
                <small>This link will expire in 30 days</small>
              </p>
              
              <p>Once imported, you can:</p>
              <ul>
                <li>✨ View the complete diagram</li>
                <li>🔄 Replace your current canvas with this one</li>
                <li>🎨 Merge it with your existing canvas</li>
                <li>✏️ Edit and customize as needed</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>New to Notes0? <a href="${siteUrl}" style="color: #2563eb;">Sign up for free</a> to start creating diagrams with voice!</p>
              <p>Questions? Contact us at support@notes0.app</p>
              <p>Happy diagramming!<br>The Notes0 Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await resend.sendEmail(ctx, {
      from: "noor@notes0.app",
      to: recipientEmail,
      subject: `${senderName} shared a canvas with you on Notes0 🎨`,
      html: html,
    });

    return null;
  },
});
