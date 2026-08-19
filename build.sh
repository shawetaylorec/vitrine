#!/bin/sh
# Rebuild the single-file app from its parts.
cd "$(dirname "$0")"
{ cat _shell.html; echo '<script>'; cat _p1.js _p2.js _p3.js _p4.js; echo '</script>'; } > index.html
wc -c index.html
