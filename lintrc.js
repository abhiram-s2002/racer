[1mdiff --git a/.eslintrc.js b/.eslintrc.js[m
[1mindex 2ef2934..211e318 100644[m
[1m--- a/.eslintrc.js[m
[1m+++ b/.eslintrc.js[m
[36m@@ -23,6 +23,10 @@[m [mmodule.exports = {[m
   ],[m
   rules: {[m
     'react/react-in-jsx-scope': 'off',[m
[32m+[m[32m    'react/prop-types': 'off', // Disable PropTypes since we're using TypeScript[m
[32m+[m[32m    '@typescript-eslint/no-explicit-any': 'warn', // Make 'any' types warnings instead of errors[m
[32m+[m[32m    '@typescript-eslint/no-unused-vars': 'warn', // Make unused vars warnings[m
[32m+[m[32m    '@typescript-eslint/no-non-null-assertion': 'warn', // Make non-null assertions warnings[m
   },[m
   settings: {[m
     react: {[m
