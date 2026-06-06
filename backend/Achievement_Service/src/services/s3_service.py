import os
import aioboto3


class S3Service:
    BUCKET = "guides"

    def __init__(self, url: str, access_key: str, secret_key: str):
        self._url = url
        self._public_url = os.getenv("S3_PUBLIC_URL", url)
        self._session = aioboto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def _client(self):
        return self._session.client("s3", endpoint_url=self._url)

    async def upload_guide(self, key: str, content: bytes) -> str:
        async with self._client() as s3:
            await s3.put_object(
                Bucket=self.BUCKET,
                Key=key,
                Body=content,
                ContentType="text/markdown",
            )
        return self.get_url(key)

    async def delete_guide(self, key: str) -> None:
        async with self._client() as s3:
            await s3.delete_object(Bucket=self.BUCKET, Key=key)

    def get_url(self, key: str) -> str:
        return f"{self._public_url}/{self.BUCKET}/{key}"

    def guide_key(self, user_id: int, guide_id: str) -> str:
        return f"{user_id}/{guide_id}.md"
