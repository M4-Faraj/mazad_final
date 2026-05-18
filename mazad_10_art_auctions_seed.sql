USE mazad_db;

SET FOREIGN_KEY_CHECKS=0;

DELETE FROM comment_deletion_log
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM live_viewers
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM live_messages
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM auction_views
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM auction_comments
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM auction_images
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM favorites
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM bids
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM notifications
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM token_ledger
WHERE auction_id IN (SELECT id FROM auctions WHERE LOWER(category) = 'art');

DELETE FROM auctions
WHERE LOWER(category) = 'art';

INSERT INTO auctions
(id, user_id, title, description, category, image, start_price, current_price, auction_type, status, end_time, winner_user_id, winner_bid_amount, settled_at, expected_final_price, max_acceptable_price, featured, category_showcase, showcase_order)
VALUES
(1050, 3, 'Abstract Gold Horizon Canvas', 'A large contemporary abstract canvas with deep navy tones, gold brush strokes, and dramatic gallery lighting.', 'art', 'images/auctions/art_01.png', 12000.00, 18500.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 3 HOUR), NULL, NULL, NULL, 26000.00, 32000.00, 1, 1, 1),
(1051, 4, 'Rainy Cityscape Oil Painting', 'An ornate framed oil painting showing a glowing rainy city waterfront with rich blue and gold reflections.', 'art', 'images/auctions/art_02.png', 18000.00, 26500.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 5 HOUR), NULL, NULL, NULL, 36000.00, 44000.00, 1, 1, 2),
(1052, 5, 'Royal Portrait Classic Painting', 'A classical framed portrait artwork with warm museum lighting, antique details, and elegant historic character.', 'art', 'images/auctions/art_03.png', 22000.00, 34000.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 7 HOUR), NULL, NULL, NULL, 47000.00, 56000.00, 1, 1, 3),
(1053, 6, 'Bronze Horse Sculpture', 'A powerful bronze horse sculpture displayed on a black marble pedestal inside a luxury gallery.', 'art', 'images/auctions/art_04.png', 30000.00, 47500.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 9 HOUR), NULL, NULL, NULL, 65000.00, 78000.00, 1, 1, 4),
(1054, 7, 'Marble Classical Bust', 'A refined white marble bust inspired by classical sculpture, presented in a dark gold gallery setting.', 'art', 'images/auctions/art_05.png', 16000.00, 24800.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 11 HOUR), NULL, NULL, NULL, 34000.00, 41000.00, 0, 1, 5),
(1055, 8, 'Blue Gold Ribbon Sculpture', 'A modern metallic sculpture with blue and gold curved forms, polished reflections, and premium gallery display.', 'art', 'images/auctions/art_06.png', 24000.00, 39000.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 13 HOUR), NULL, NULL, NULL, 54000.00, 66000.00, 1, 1, 6),
(1056, 9, 'Golden Mountain Landscape Painting', 'A wide framed landscape painting featuring mountains, lake reflections, warm sunset tones, and a luxury gold frame.', 'art', 'images/auctions/art_07.png', 28000.00, 42000.00, 'live', 'approved', DATE_ADD(NOW(), INTERVAL 15 HOUR), NULL, NULL, NULL, 58000.00, 70000.00, 0, 0, 0),
(1057, 10, 'Black Gold Calligraphy Abstract', 'A bold abstract calligraphy-style painting with black curves, gold accents, and textured neutral background.', 'art', 'images/auctions/art_08.png', 14000.00, 21000.00, 'normal', 'approved', DATE_ADD(NOW(), INTERVAL 8 DAY), NULL, NULL, NULL, 30000.00, 38000.00, 0, 0, 0),
(1058, 11, 'Geometric Gold Relief Artwork', 'A modern geometric relief artwork with layered black, cream, and gold textures in a high-end interior.', 'art', 'images/auctions/art_09.png', 20000.00, 31500.00, 'normal', 'approved', DATE_ADD(NOW(), INTERVAL 10 DAY), NULL, NULL, NULL, 43000.00, 52000.00, 0, 0, 0),
(1059, 12, 'Blue Glass Gallery Sculpture', 'A luxury glass sculpture with blue and amber reflections, displayed in a dim contemporary gallery.', 'art', 'images/auctions/art_10.png', 26000.00, 40500.00, 'normal', 'pending', DATE_ADD(NOW(), INTERVAL 12 DAY), NULL, NULL, NULL, 56000.00, 68000.00, 0, 0, 0);

INSERT INTO auction_images (auction_id, file_path) VALUES
(1050, 'images/auctions/art_01.png'),
(1051, 'images/auctions/art_02.png'),
(1052, 'images/auctions/art_03.png'),
(1053, 'images/auctions/art_04.png'),
(1054, 'images/auctions/art_05.png'),
(1055, 'images/auctions/art_06.png'),
(1056, 'images/auctions/art_07.png'),
(1057, 'images/auctions/art_08.png'),
(1058, 'images/auctions/art_09.png'),
(1059, 'images/auctions/art_10.png');

INSERT INTO bids (auction_id, user_id, bid_amount, created_at, status, review_reason) VALUES
(1050, 8, 18500.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'approved', NULL),
(1051, 9, 26500.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'approved', NULL),
(1052, 10, 34000.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'approved', NULL),
(1053, 11, 47500.00, DATE_SUB(NOW(), INTERVAL 18 HOUR), 'approved', NULL),
(1054, 12, 24800.00, DATE_SUB(NOW(), INTERVAL 12 HOUR), 'approved', NULL);

INSERT INTO favorites (user_id, auction_id, created_at) VALUES
(4, 1050, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, 1050, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 1051, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, 1052, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(8, 1053, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(9, 1054, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
(10, 1055, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(11, 1056, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(12, 1057, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(3, 1058, DATE_SUB(NOW(), INTERVAL 3 HOUR));

SET FOREIGN_KEY_CHECKS=1;
