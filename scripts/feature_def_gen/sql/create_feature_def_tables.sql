DROP TABLE IF EXISTS `feature_defs_cnvr`;
CREATE TABLE `feature_defs_cnvr` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gene_name` tinytext,
  `num_search_hits` int(11),
  `value_field` tinytext,
  `internal_feature_id` tinytext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `feature_defs_gexp`;
CREATE TABLE `feature_defs_gexp` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gene_name` varchar(255),
  `center` varchar(255),
  `platform` varchar(255),
  `value_label` varchar(255),
  `internal_feature_id` varchar(255),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `feature_defs_gnab`;
CREATE TABLE `feature_defs_gnab` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gene_name` tinytext,
  `num_search_hits` int(11),
  `value_field` tinytext,
  `internal_feature_id` tinytext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `feature_defs_meth`;
CREATE TABLE `feature_defs_meth` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gene_name` tinytext,
  `probe_name` tinytext,
  `platform` tinytext,
  `relation_to_gene` tinytext,
  `relation_to_island` tinytext,
  `num_search_hits` int(11),
  `value_field` tinytext,
  `internal_feature_id` tinytext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `feature_defs_mirn`;
CREATE TABLE `feature_defs_mirn` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `mirna_name` tinytext,
  `platform` tinytext,
  `num_search_hits` int(11),
  `value_field` tinytext,
  `internal_feature_id` tinytext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `feature_defs_rppa`;
CREATE TABLE `feature_defs_rppa` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `gene_name` tinytext,
  `protein_name` tinytext,
  `num_search_hits` int(11),
  `value_field` tinytext,
  `internal_feature_id` tinytext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;