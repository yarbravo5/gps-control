from datetime import timedelta


# History responses are bounded both by duration and message count.
MAX_HISTORY_RANGE = timedelta(days=7)
MAX_HISTORY_POINTS = 5_000
