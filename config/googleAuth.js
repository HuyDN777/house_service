const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Cấu hình Google OAuth
passport.use(   
    new GoogleStrategy({
        clientID: '27216481304-5v69keq2qg70kbi9sf5hfppfcd13rcfg.apps.googleusercontent.com',
        clientSecret: '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',
        callbackURL: "http://localhost:3000/auth/google/callback"
    }, 
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Kiểm tra user trong cơ sở dữ liệu
            const email = profile.emails[0].value;
            let user = await User.findByEmail(email)

            // Nếu user chưa tồn tại, tạo mới
            if (!user) {
                const userId = await User.create({
                    name: profile.displayName,
                    email,
                    username: email.split('@')[0],
                    password: null, // Không cần mật khẩu
                    avatar_url: profile.photos[0].value
                });
                user = await User.findByEmail(email);
            }

            done(null, user);
        } catch (err) {
            done(err, null);
        }
    }
));

// Serialize và deserialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});