SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for file
-- ----------------------------
DROP TABLE IF EXISTS `file`;
CREATE TABLE `file` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `guid` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '文档唯一标识（用于协同编辑）',
  `name` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '文档名',
  `content` longtext COLLATE utf8mb4_bin NOT NULL COMMENT '文档内容，Base64 或 JSON',
  `type` varchar(64) COLLATE utf8mb4_bin NOT NULL DEFAULT 'doc' COMMENT '文档类型，如 doc/pdf',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL COMMENT '逻辑删除时间',
  `author_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '作者 user_id',
  `updater` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '最后更新人 user_id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `guid` (`guid`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `file_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '用户唯一ID，可用于业务逻辑中的标识',
  `login_name` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `user_name` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '哈希后的密码',
  `avatar` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '头像',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `username` (`user_name`),
  UNIQUE KEY `login_name` (`login_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
