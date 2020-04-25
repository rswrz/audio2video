# audio2video

Heavily inspired from https://serverless.com/blog/publish-aws-lambda-layers-serverless-framework/

## Prepare ffmpeg layer
```
mkdir layer
cd layer
curl -O https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
tar xf ffmpeg-git-amd64-static.tar.xz
rm ffmpeg-git-amd64-static.tar.xz
mv ffmpeg-git-*-amd64-static ffmpeg
cd ..
```

## Deploy
```
serverless deploy
```

## Usage
Upload `.mp3` file to S3 Bucket and wait for Lambda to create and place `.mp4` file into same S3 Bucket. See CloudWatch logs for details and debuging purposes.