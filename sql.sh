#!/bin/sh

sqlite3 eversion.db "select count(*) from accounts"

# get count of sell expiry times by hour
select substr(expire_time, 0, 14), count(*) from orders where side = 'sell' group by 1 order by 1;