# Security Policy

## Overview

Canvas Grading with AI handles sensitive student data and requires access to both Canvas LMS and Claude AI APIs. This document outlines security best practices, data handling policies, and procedures for reporting security vulnerabilities.

## 🔒 Security Best Practices

### API Key Management

#### DO ✅

- **Store API keys in Script Properties** (not in the spreadsheet)
- **Use separate API keys** for development and production
- **Set expiration dates** on Canvas API tokens
- **Regenerate keys** if you suspect compromise
- **Delete API keys** when no longer needed
- **Use minimal permissions** for Canvas API tokens
- **Rotate API keys periodically** (recommended: every 90 days)

#### DON'T ❌

- **Never commit API keys** to version control
- **Never share API keys** via email or messaging
- **Never store API keys** in sheet cells
- **Never use API keys** in URLs or logs
- **Never take screenshots** showing API keys
- **Never use production keys** for testing

### Access Control

#### Google Sheets Access

- **Limit editing access** to authorized personnel only
- **Use "View only" permissions** for observers
- **Review sharing settings** regularly
- **Remove access** for users who no longer need it
- **Avoid "Anyone with the link"** sharing
- **Enable version history** to track changes
- **Consider institutional Google Workspace** for enhanced controls

#### Canvas Access

- **Use instructor-level permissions** minimum
- **Avoid admin-level access** unless required
- **Review Canvas course access** regularly
- **Use role-based permissions** in Canvas
- **Log API usage** for auditing purposes

### Data Protection

#### Student Data Handling

**FERPA Compliance:**

This tool processes student education records. To maintain FERPA compliance:

- ✅ Ensure all users have a legitimate educational interest
- ✅ Limit data access to what's necessary for the task
- ✅ Keep the spreadsheet within your institution's Google Workspace
- ✅ Do not share student data with unauthorized parties
- ✅ Securely dispose of data when no longer needed
- ✅ Document data handling procedures
- ✅ Train users on FERPA requirements

**Data Minimization:**

- Only fetch data you actually need
- Delete spreadsheets after grading is complete
- Avoid including sensitive identifiers if possible
- Use Canvas ID instead of Social Security numbers
- Remove identifiable information before sharing examples

**Data Transmission:**

- All API calls use HTTPS encryption
- Student data is transmitted only between:
  - Canvas LMS servers
  - Google Sheets servers
  - Claude AI API servers (for grading purposes only)
- No data is stored on third-party servers beyond these systems

### Claude AI Considerations

#### What Data is Sent to Claude

When using AI grading features, the following data is sent to Anthropic's Claude API:

- Question prompts
- Student answers
- Answer keys/rubrics
- Points possible

The following is NOT sent:

- Student names
- Student IDs
- Email addresses
- Other personally identifiable information

#### Anthropic's Data Practices

According to Anthropic's policies:

- API requests are not used to train models
- Data is not stored long-term by default
- Communications are encrypted in transit
- Review [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for details

#### Recommendations

- Review Anthropic's terms of service and privacy policy
- Ensure compliance with your institution's policies
- Consider institutional agreements with Anthropic if available
- Be mindful of sensitive content in prompts/answers

## 🛡️ Security Features

### Built-in Protections

1. **Encrypted Storage**: API keys stored in Google Apps Script Properties (encrypted at rest)
2. **Secure Communication**: All API calls use HTTPS
3. **No Third-Party Dependencies**: Core functionality uses only Google Apps Script and official APIs
4. **Input Validation**: User inputs are validated before processing
5. **Error Handling**: Errors don't expose sensitive information
6. **Audit Logging**: Key operations are logged (without sensitive data)

### Optional Enhanced Security

For additional security, consider:

1. **Two-Factor Authentication**: Enable 2FA on Google and Canvas accounts
2. **IP Restrictions**: Use Canvas API tokens with IP restrictions if available
3. **VPN Usage**: Connect through institutional VPN when accessing sensitive data
4. **Dedicated Accounts**: Use service accounts for automated grading
5. **Regular Audits**: Review access logs and API usage periodically

## 🚨 Reporting Security Vulnerabilities

### What to Report

Please report any of the following:

- Exposure of API keys or credentials
- Unauthorized data access
- Data leaks or unintended data sharing
- Authentication or authorization bypasses
- Injection vulnerabilities (SQL, code, etc.)
- Cross-site scripting (XSS) issues
- Any security concern, however minor

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead:

1. **Email the maintainer** directly (find contact in README.md)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Use subject line**: "SECURITY: Canvas Grading with AI"
4. **Wait for acknowledgment** before public disclosure

### Response Timeline

- **24 hours**: Initial acknowledgment
- **7 days**: Assessment and preliminary response
- **30 days**: Fix developed and tested (for critical issues)
- **60 days**: Public disclosure (coordinated)

### Recognition

Security researchers will be credited in:
- SECURITY.md acknowledgments
- Release notes (if appropriate)
- Project documentation

## 📋 Security Checklist for Users

Before deploying to production:

- [ ] API keys stored in Script Properties only
- [ ] Canvas API token has appropriate expiration date
- [ ] Google Sheet sharing is restricted to authorized users
- [ ] Tested on sample data first (not production data)
- [ ] Reviewed institutional policies on AI use
- [ ] Verified FERPA compliance procedures
- [ ] Documented data handling processes
- [ ] Trained users on security best practices
- [ ] Established procedure for key rotation
- [ ] Set up monitoring for unusual activity

## 🔄 Incident Response

If you suspect a security incident:

### Immediate Actions

1. **Stop using the tool** immediately
2. **Revoke compromised API keys** in Canvas and Anthropic
3. **Change passwords** for affected accounts
4. **Document the incident** (what happened, when, who was affected)
5. **Notify your institution's IT security** team

### Follow-up Actions

1. **Assess impact**: Determine what data was exposed
2. **Notify affected parties**: Follow your institution's breach notification policy
3. **Review access logs**: Check for unauthorized access
4. **Update security measures**: Implement improvements
5. **Report to maintainer**: Help us improve security for all users

## 🎓 Educational Institution Considerations

### IT Department Collaboration

- **Notify IT security** before deploying
- **Review with compliance office** for FERPA/GDPR compliance
- **Document in DPA** (Data Processing Agreement) if required
- **Include in privacy notices** to students
- **Coordinate with Canvas administrators**

### Institutional Agreements

Consider establishing:

- **Data Processing Agreements** with Anthropic
- **Business Associate Agreements** if handling PHI
- **Vendor contracts** for enterprise support
- **Institutional API keys** with negotiated terms

### Student Privacy Rights

Respect students' rights under:

- **FERPA** (Family Educational Rights and Privacy Act) - US
- **GDPR** (General Data Protection Regulation) - EU
- **Other applicable** local privacy laws

Ensure students can:
- Request their data
- Opt-out of AI grading (if policy allows)
- Understand how their work is processed

## 📚 Additional Resources

### Policies and Standards

- [FERPA Overview](https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html)
- [Canvas Security](https://www.instructure.com/canvas/trust-center/security)
- [Google Workspace Security](https://workspace.google.com/security/)
- [Anthropic Privacy](https://www.anthropic.com/privacy)

### Security Guides

- [Google Apps Script Security](https://developers.google.com/apps-script/guides/security)
- [Canvas API Security](https://canvas.instructure.com/doc/api/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## ⚖️ Legal Compliance

### Disclaimer

This tool is provided "as is" without warranty. Users are responsible for:

- Ensuring compliance with all applicable laws
- Following institutional policies
- Protecting student privacy
- Securing API keys and credentials
- Reviewing and validating AI-generated output

### Liability

The maintainers are not responsible for:

- Unauthorized access to data
- Misuse of the tool
- Non-compliance with laws or policies
- Errors in AI-generated grades or feedback
- Data breaches resulting from improper configuration

### Terms of Service

Use of this tool constitutes acceptance of:

- GitHub's Terms of Service
- Google's Terms of Service
- Canvas LMS Terms of Use
- Anthropic's Terms of Service

## 📞 Security Contact

For security inquiries:

- **GitHub**: [Security Advisories](https://github.com/jlouisbru/Canvas-grading-with-AI/security/advisories)
- **Email**: Available through Chapman University directory
- **Response Time**: Within 24 hours for critical issues

---

**Last Updated**: November 2024

**Security is everyone's responsibility. When in doubt, ask! 🔒**
