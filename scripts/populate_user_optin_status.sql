TRUNCATE TABLE accounts_useroptinstatus;

-- set existing active user's optin status to 1 (NOT_SEEN)
INSERT INTO accounts_useroptinstatus (user_id, opt_in_status)
SELECT id, 1 FROM auth_user WHERE is_active=1;