@app
improvmx-failure-reporter

@scheduled
report-failures cron(0 21 * * ? *)

@aws
region eu-central-1
runtime nodejs14.x
