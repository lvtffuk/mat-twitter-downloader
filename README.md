# mat-twitter-downloader
Downloader for Twitter data for Media Analytics Tool project.

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
`WORKERS` | Worker names separated by commas. Possible values: `tweets`, `followers`, `followings` | :x: |
`AFFINITY` | Indicates if the affinity of followers should be calculated. For affinity `followers` worker must be enabled. | :x: | `0`
`AFFINITY_FOLLOWING_THRESHOLD` | Percents of common following users to analyzing user's followers. | :x: | `10`
`CSV_SEPARATOR` | The separator of the input `csv` files. | :x: | `;`
`WORKER_CONCURRENCY` | The count of parallel runs of the downloading ads archive. | :x: | `5`
`CLEAR` | Indicates if the output dir should be cleared before the run. All downloads are starting again. | :x: | `0`
`USER_COUNT` | Total count of user on the twitter segment. | :x: | `500000`
`IGNORE_USERS` | Indicates if the app should download only tweets. **DEPRECATED** Equivalent of `WORKERS=tweets` | :x: | `0`

### Affinity
If the affinity is enabled followings of followers are downloaded in the downloading process. It can download thousands of following users for one profile.

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
The output is stored in `csv` files in the output directory.  
File | Description
:------------ | :-------------
`affinities` | Directory containing calculated affinities of analyzed profiles.
`profiles` | Directory containing info about analyzed profiles.
`tweets.csv` | Latest tweets of the users.
`followers.csv` | The followers of the users.
`followers.nsd.csv` | Calculated normalized social distance for followers.
`followings.csv` | Followings of the users.
`followings.nsd.csv` | Calculated normalized social distance for followings.
`friends.csv` | Users following each other. It's not create if one of user workers `followers`, `followings` is disabled.

### CSV files
CSV files except affinity and nsd files are saved without headers.
#### Tweets
```csv
"userId";"username";"tweetId";"tweet";"createdTime"
```
#### Followers & followings
```csv
"userId";"username";"followerId";"followerUsername"
```

### Profiles
The directory contains `json` files for each of the profile which is analyzed in the downloading process. 

### Affinities
The directory contains `csv` files of affinities for analyzed profiles. Per each user the `[username].csv` file is created. In addition normalized social distance is calculated for the followers. Per each user the `[username].nsd.csv` file is created.

### Normalized social distance
Normalized social distance (NSD) needs at least to profiles to analyze.

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
