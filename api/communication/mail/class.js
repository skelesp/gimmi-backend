// --- Mail class ---
var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

// Setup mailobject
var smtpTransporter = nodemailer.createTransport({
    host: 'smtp.mijnhostingpartner.nl',
    port: 587,
    secure: false,
    auth: {
        user: "no-reply@test.gimmi.be",
        pass: "testGimmi1"
    }
});

// verify connection configuration
smtpTransporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Mailserver is connected');
    }
});

//smtp middleware
smtpTransporter.use('compile', htmlToText()); //The plugin checks if there is no text option specified and populates it based on the html value. (https://www.npmjs.com/package/html-to-text)

// Send an email via API
exports.sendViaAPI = function (req, res, next) {
    var mailOptions = {
        from: '"Gimmi" <no-reply@gimmi.be>',
        to: req.body.to,
        subject: req.body.subject,
        html: req.body.html //geen text-value meer ==> html wordt naar text omgezet
    };

    smtpTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            var data = {
                error: error,
                message: 'Mail not sent.'
            }
            res.status(500).json(data);
            return next();
        }
        console.log('Message sent: %s (%s)', info.messageId, info.response);
        res.status(250).json(info.messageId);
    });
};

// Send an email from server
exports.sendLocal = function (to, subject, html) {
    var mailOptions = {
        from: '"Gimmi" <no-reply@gimmi.be>',
        to: to,
        subject: subject,
        html: html //geen text-value meer ==> html wordt naar text omgezet
    };

    smtpTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            var info = {
                error: error,
                message: 'Mail not sent.'
            }
            return info;
        }
        console.log('Message sent: %s (%s)', info.messageId, info.response);
        return info;
    });
};

// user MHP = no-reply@test.gimmi.be
// password MHP = testGimmi1
// server MHP = smtp.mijnhostingpartner.nl
// port MHP = 25 (SMTP)

/* // Generate test SMTP service account from ethereal.email
// Only needed if you don't have a real mail account for testing
nodemailer.createTestAccount((err, account) => {

    // create reusable smtpTransporter object using the default SMTP transport
    let smtpTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: account.user, // generated ethereal user
            pass: account.pass  // generated ethereal password
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
        to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };

    // send mail with defined transport object
    smtpTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}); 
*/