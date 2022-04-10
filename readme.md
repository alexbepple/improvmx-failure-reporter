
## Deploy
```
just deploy
```


## Backlog

## Technical backlog

Lambda is large (~35MB). Make smaller. But how? Hypothesis: tree-shaking does not work as well as supposed. Ideas (but none looks really promising): ESM (beware date-fns), arc-plugin-esbuild.

There is unused code (regarding event history of items).
