import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import { User } from "../models/User.js";

export function configurePassport() {
  if (!env.googleClientId || !env.googleClientSecret) {
    console.warn("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            done(new Error("Google account does not expose an email address."));
            return;
          }

          const avatar = profile.photos?.[0]?.value || "";
          const existingUser = await User.findOne({ email });
          const user = existingUser
            ? await User.findByIdAndUpdate(
                existingUser._id,
                {
                  googleId: profile.id,
                  name: profile.displayName || email,
                  avatar
                },
                {
                  new: true,
                  runValidators: true
                }
              )
            : await User.create({
                googleId: profile.id,
                name: profile.displayName || email,
                email,
                avatar
              });

          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}
