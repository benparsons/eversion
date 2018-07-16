CREATE TABLE events(type TEXT, order_id TEXT, order_type TEXT, size REAL, price REAL, side TEXT, product_id TEXT, sequence INTEGER, user_id TEXT, profile_id TEXT, time TEXT, remaining_size REAL, reason TEXT);
CREATE TABLE accounts(eth_available REAL, eth_hold REAL, btc_available REAL, btc_hold REAL, time TEXT);
CREATE TABLE orders(
	`type`	TEXT,
	`order_id`	TEXT,
	`order_type`	TEXT,
	`size`	REAL,
	`price`	REAL,
	`side`	TEXT,
	`product_id`	TEXT,
	`remaining_size`	REAL,
	`reason`	TEXT,
	`expire_time` TEXT,
	`post_only` INTEGER,
    `settled` INTEGER,
	`last_updated` TEXT
);
CREATE UNIQUE INDEX `orders_unique_order_id` ON `orders` (
	`order_id`
);
