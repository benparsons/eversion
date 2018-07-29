# configure graphite

First I set `/opt/graphite/conf/storage-schemas.conf` as follows:

```
[default_1min_for_1day]
pattern = .*
retentions = 1m:90d
```

Then I ran:

```
whisper-auto-resize.py ./storage/whisper/ ./conf/ --carbonlib ./lib --doit
```

This worked for some fields.