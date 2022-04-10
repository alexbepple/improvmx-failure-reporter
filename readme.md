
## Deploy
```
just deploy
```


## Backlog

## Technical backlog

Lambda is large (~35MB). Disk usage shows that date-fns & openpgp likely main culprits → Make smaller. But how? Hypothesis: tree-shaking does not work as well as supposed. Ideas (but none looks really promising): ESM (beware date-fns), arc-plugin-esbuild. Using ESM seems to have no effect at all (tried with openpgp). :-(

There is unused code (regarding event history of items).
