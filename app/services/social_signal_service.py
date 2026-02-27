"""
Social signal service — stores Reddit and X signals in the DB
and orchestrates collection across both platforms.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social_signal import SocialSignal, SignalSource
from app.scrapers.reddit import RedditScraper, RedditSignal
from app.scrapers.twitter_x import TwitterXScraper, TwitterSignal

logger = logging.getLogger(__name__)


async def collect_and_store_signals(
    db: AsyncSession,
    resource_id: uuid.UUID,
    resource_title: str,
    resource_url: str | None = None,
) -> int:
    """
    Scrape Reddit + X for mentions of the resource and persist new signals.
    Returns the number of new signals stored.
    """
    stored = 0

    # ── Reddit ────────────────────────────────────────────────────────────────
    try:
        reddit = RedditScraper()
        reddit_signals: list[RedditSignal] = await reddit.collect_signals(
            resource_title, resource_url, max_posts=5
        )
        for sig in reddit_signals:
            if not sig.content_snippet:
                continue
            # Deduplicate by source_post_id
            if sig.source_post_id:
                exists = await db.execute(
                    select(SocialSignal.id).where(
                        SocialSignal.source_post_id == sig.source_post_id,
                        SocialSignal.source == SignalSource.reddit,
                    )
                )
                if exists.scalar_one_or_none():
                    continue

            db.add(
                SocialSignal(
                    resource_id=resource_id,
                    source=SignalSource.reddit,
                    source_post_id=sig.source_post_id or None,
                    source_url=sig.source_url or None,
                    author=sig.author or None,
                    content_snippet=sig.content_snippet,
                    subreddit=sig.subreddit or None,
                    upvotes=sig.upvotes,
                    comment_count=sig.comment_count,
                    posted_at=sig.posted_at,
                )
            )
            stored += 1
    except Exception as e:
        logger.error("Reddit signal collection failed for resource %s: %s", resource_id, e)

    # ── X (Twitter) ───────────────────────────────────────────────────────────
    try:
        twitter = TwitterXScraper()
        x_signals: list[TwitterSignal] = await twitter.collect_signals(
            resource_title, max_results=5
        )
        for sig in x_signals:
            if not sig.content_snippet:
                continue
            if sig.source_post_id:
                exists = await db.execute(
                    select(SocialSignal.id).where(
                        SocialSignal.source_post_id == sig.source_post_id,
                        SocialSignal.source == SignalSource.twitter_x,
                    )
                )
                if exists.scalar_one_or_none():
                    continue

            db.add(
                SocialSignal(
                    resource_id=resource_id,
                    source=SignalSource.twitter_x,
                    source_post_id=sig.source_post_id or None,
                    source_url=sig.source_url or None,
                    author=sig.author or None,
                    content_snippet=sig.content_snippet,
                    upvotes=sig.upvotes,
                    comment_count=sig.comment_count,
                    posted_at=sig.posted_at,
                )
            )
            stored += 1
    except Exception as e:
        logger.error("X signal collection failed for resource %s: %s", resource_id, e)

    await db.flush()
    logger.info("Stored %d new social signals for resource %s", stored, resource_id)
    return stored
