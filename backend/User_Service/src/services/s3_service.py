import os
import aioboto3
import httpx


class S3Service:
    BUCKET = "avatars"

    def __init__(self, url: str, access_key: str, secret_key: str):
        self._url = url
        self._public_url = os.getenv("S3_PUBLIC_URL", url)
        self._session = aioboto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def _client(self):
        return self._session.client("s3", endpoint_url=self._url)

    async def copy_from_url(self, source_url: str, key: str) -> str:
        async with httpx.AsyncClient() as http:
            resp = await http.get(source_url, follow_redirects=True)
            resp.raise_for_status()

        async with self._client() as s3:
            await s3.put_object(
                Bucket=self.BUCKET,
                Key=key,
                Body=resp.content,
                ContentType=resp.headers.get("content-type", "image/jpeg"),
            )

        return self.avatar_proxy_url(key)

    async def get_presigned_put_url(self, key: str) -> str:
        # Must sign with the public URL — the host is included in the signature,
        # so generating with the internal URL and replacing it later breaks verification.
        # ContentType is intentionally excluded from signed params so any image type works.
        public_client = self._session.client("s3", endpoint_url=self._public_url)
        async with public_client as s3:
            url = await s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.BUCKET, "Key": key},
                ExpiresIn=300,
            )
        return url

    async def get_object(self, key: str) -> tuple[bytes, str]:
        async with self._client() as s3:
            response = await s3.get_object(Bucket=self.BUCKET, Key=key)
            body = await response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")
            return body, content_type

    def avatar_proxy_url(self, key: str) -> str:
        return f"/api/user/avatar/{key}"

    def avatar_key(self, user_id: int, source: str) -> str:
        return f"{user_id}/{source}"

    def banner_key(self, user_id: int) -> str:
        return f"{user_id}/banner"

    def banner_proxy_url(self, user_id: int) -> str:
        return f"/api/user/banner/{user_id}"
