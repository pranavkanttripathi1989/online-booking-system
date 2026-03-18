-- MediBook Initial Database Setup
-- This file runs automatically when MySQL container first initialises

CREATE DATABASE IF NOT EXISTS `medibook_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `medibook_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `medibook_db`.* TO 'medibook'@'%';
GRANT ALL PRIVILEGES ON `medibook_testing`.* TO 'medibook'@'%';
FLUSH PRIVILEGES;
