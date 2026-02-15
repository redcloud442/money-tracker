import { render } from "@react-email/render";
import React from "react";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "");

export const sendEmail = async (sendEmailDto: {
  to: string;
  subject: string;
  html: React.ReactNode;
  from: string;
}) => {
  const { to, subject, html, from } = sendEmailDto;

  const htmlRendered = await render(html);

  await resend.emails.send({
    from: "support <no-reply@portfolio-glorioso.site>",
    to: to,
    subject: subject,
    html: htmlRendered,
  });

  return {
    message: "Email sent successfully",
  };
};
