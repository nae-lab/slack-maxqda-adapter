# Slack to MAXQDA Adapter

Example usage:

```sh
./fetch_messages.sh 2024-08-13 2024-09-05
```

This script retrieves messages for a multi-month range, concatenates the daily output into out/slack-log.md, and converts it to out/slack-log.docx using pandoc.

You would import the resulting `out/slack-log.docx` into MAXQDA using preprocessor feature.
