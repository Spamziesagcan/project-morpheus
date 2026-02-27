"""
Reddit social signal scraper — uses the official Reddit REST API (no PRAW dependency).

Searches Reddit for posts/comments that mention a resource URL or resource title
and collects upvotes + content for sentiment analysis.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Tech-relevant subreddits to search for resource mentions
TARGET_SUBREDDITS = [
    "learnprogramming",
    "webdev",
    "programming",
    "cscareerquestions",
    "devops",
    "datascience",
    "MachineLearning",
    "learnmachinelearning",
    "Python",
    "javascript",
    "reactjs",
    "node",
    "docker",
    "kubernetes",
]

_SEARCH_URL = "https://www.reddit.com/search.json"
_COMMENTS_URL = "https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"


@dataclass
class RedditSignal:
    source: str = "reddit"
    source_post_id: str = ""
    source_url: str = ""
    author: str = ""
    content_snippet: str = ""
    subreddit: str = ""
    upvotes: int = 0
    downvotes: int = 0
    comment_count: int = 0
    posted_at: datetime | None = None


class RedditScraper:
    """
    Fetches Reddit posts and top comments that mention a resource
    title or URL. No API key required for basic search (uses public JSON API).
    Optional OAuth for higher rate limits.
    """

    HEADERS = {"User-Agent": settings.reddit_user_agent}

    async def _search_posts(
        self, client: httpx.AsyncClient, query: str, limit: int = 10
    ) -> list[dict]:
        """Search Reddit for posts mentioning the query."""
        try:
            resp = await client.get(
                _SEARCH_URL,
                params={
                    "q": query,
                    "sort": "relevance",
                    "limit": limit,
                    "type": "link,self",
                    "restrict_sr": False,
                },
            )
            resp.raise_for_status()
            return resp.json().get("data", {}).get("children", [])
        except Exception as e:
            logger.warning("Reddit search failed for '%s': %s", query, e)
            return []

    async def _fetch_top_comments(
        self, client: httpx.AsyncClient, subreddit: str, post_id: str, limit: int = 5
    ) -> list[dict]:
        """Fetch top-level comments for a post."""
        try:
            resp = await client.get(
                _COMMENTS_URL.format(subreddit=subreddit, post_id=post_id),
                params={"sort": "top", "limit": limit, "depth": 1},
            )
            resp.raise_for_status()
            data = resp.json()
            if len(data) < 2:
                return []
            return data[1].get("data", {}).get("children", [])
        except Exception as e:
            logger.warning("Reddit comments fetch failed (%s/%s): %s", subreddit, post_id, e)
            return []

    async def collect_signals(
        self, resource_title: str, resource_url: str | None = None, max_posts: int = 5
    ) -> list[RedditSignal]:
        """
        Search Reddit for mentions of a resource and return signal objects
        ready for the sentiment layer.

        Args:
            resource_title: Title of the resource (used as search query)
            resource_url:   URL of the resource (used as supplemental query)
            max_posts:      How many top posts to fetch signals from
        """
        signals: list[RedditSignal] = []
        queries = [resource_title]
        if resource_url:
            queries.append(resource_url)

        async with httpx.AsyncClient(
            headers=self.HEADERS, timeout=20, follow_redirects=True
        ) as client:
            for query in queries:
                posts = await self._search_posts(client, query, limit=max_posts)

                for post_data in posts:
                    post = post_data.get("data", {})
                    subreddit = post.get("subreddit", "")
                    post_id = post.get("id", "")
                    title = post.get("title", "")
                    selftext = post.get("selftext", "")
                    upvotes = post.get("ups", 0)
                    num_comments = post.get("num_comments", 0)
                    created_utc = post.get("created_utc")
                    permalink = post.get("permalink", "")
                    author = post.get("author", "")

                    snippet = (title + " " + selftext).strip()[:500]

                    signals.append(
                        RedditSignal(
                            source_post_id=post_id,
                            source_url=f"https://www.reddit.com{permalink}",
                            author=author,
                            content_snippet=snippet,
                            subreddit=subreddit,
                            upvotes=max(upvotes, 0),
                            comment_count=num_comments,
                            posted_at=(
                                datetime.fromtimestamp(created_utc, tz=timezone.utc)
                                if created_utc
                                else None
                            ),
                        )
                    )

                    # Also grab top comments — they often contain the most opinionated text
                    if subreddit and post_id:
                        comments = await self._fetch_top_comments(client, subreddit, post_id)
                        for comment_data in comments:
                            comment = comment_data.get("data", {})
                            body = comment.get("body", "")
                            if not body or body in ("[deleted]", "[removed]"):
                                continue
                            c_upvotes = max(comment.get("ups", 0), 0)
                            c_created = comment.get("created_utc")
                            signals.append(
                                RedditSignal(
                                    source_post_id=comment.get("id", ""),
                                    source_url=f"https://www.reddit.com{permalink}",
                                    author=comment.get("author", ""),
                                    content_snippet=body.strip()[:500],
                                    subreddit=subreddit,
                                    upvotes=c_upvotes,
                                    posted_at=(
                                        datetime.fromtimestamp(c_created, tz=timezone.utc)
                                        if c_created
                                        else None
                                    ),
                                )
                            )

        logger.info(
            "Reddit collected %d signals for '%s'", len(signals), resource_title
        )
        return signals
