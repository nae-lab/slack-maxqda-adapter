# Slack to MAXQDA Adapter

Example usage:

```sh
for d in (seq 13 31); pnpm main -c CXOXOXOXOXO -d 2024-08-(printf "%02d" $d) > out/2024-08-(printf "%02d" $d).md; end
cat out/* > out/slack-log.md
pandoc -i out/slack-log.md -o out/slack-log.docx
```

You would import the resulting `out/slack-log.docx` into MAXQDA using preprocessor feature.
