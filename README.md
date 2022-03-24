# mat-twitter-downloader
Downloader for Twitter ads archive for Media Analytics Tool project.

## Development
### Installation & test run
```bash
git clone git@github.com:zabkwak/mat-twitter-downloader.git
cd mat-twitter-downloader
npm install
npm start
```
## Settings
The settings are set with environment variables. 
Variable | Description | Required | Default value
:------------ | :------------- | :-------------| :-------------
`TOKENS_FILE_PATH` | The filepath of the `csv` file with access tokens. | :heavy_check_mark: | 
`PROFILES_FILE_PATH` | The filepath of the `csv` file with profile list. | :heavy_check_mark: | 
`OUT_DIR` | The directory where the output is stored. | :heavy_check_mark: | 
`CSV_SEPARATOR` | The separator of the input `csv` files. | :x: | `;`
`WORKER_CONCURRENCY` | The count of parallel runs of the downloading ads archive. | :x: | `5`
`CLEAR` | Indicates if the output dir should be cleared before the run. All downloads are starting again. | :x: | `0`
`IGNORE_USERS` | Indicates if the app should download only tweets. | :x: | `0`

## Input files
### Twitter tokens
For access to the Twitter API is required a review from the twitter. After that the projects and apps are accessible in [developer portal](https://developer.twitter.com/en/portal/dashboard). 

The tokens must be stored in `csv` files. 
#### Example
```csv
"app";"token"
"appId";"accessToken"
```
First line is header.  
The `app` is app ID from [developer portal](https://developer.twitter.com/en/portal/dashboard).  
The access token can be also retrieved in the developer portal in the project section.

The rate limit of the accessing the followers / followings is 15 requests per 15 minutes. Large profiles should be downloaded with large amount of valid tokens.

### Profile list
The profile list is simple `csv` file with one column
#### Example
```csv
"username"
"user1"
"user2"
"user3"
```
First line is header.  

## Output
The output is stored in `csv` in the output directory.  
File | Description
:------------ | :-------------
`tweets.csv` | Latest tweets of the users.
`followers.csv` | The followers of the users.
`followings.csv` | Followings of the users.
`friends.csv` | Users following each other.

## Docker
The [image](https://github.com/zabkwak/mat-twitter-downloader/pkgs/container/mat-twitter-downloader) is stored in GitHub packages registry and the app can be run in the docker environment.
```bash
docker pull ghcr.io/zabkwak/mat-twitter-downloader:latest
```

```bash
docker run \
--name=mat-twitter-downloader \
-e 'TOKENS_FILE_PATH=./input/tokens.csv' \
-e 'PROFILES_FILE_PATH=./input/profiles.csv' \
-e 'OUT_DIR=./output' \
-v '/absolute/path/to/output/dir:/usr/src/app/output' \
-v '/absolute/path/to/input/dir:/usr/src/app/input' \
ghcr.io/zabkwak/mat-twitter-downloader:latest  
```
The volumes must be set for accessing input and output data.
