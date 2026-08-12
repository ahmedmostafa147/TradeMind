# Playwright's own image, not python:slim.
#
# Chromium needs about thirty shared libraries that no slim Python image carries,
# and `playwright install-deps` on Debian pulls them one apt round at a time
# through a build that then breaks whenever Debian renames one. This image ships
# the browser and its libraries already matched to the Playwright version — so the
# tag below and the `playwright~=1.48` pin in requirements.txt must move together.
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

# Dependencies first, so a change to the parser does not re-download Chromium's
# world on every rebuild.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY radar_flows/ ./radar_flows/

# UNBUFFERED, DELIBERATELY. Cloud Run collects stdout/stderr, and Python's default
# block buffering means a job that dies mid-run flushes nothing — the failure
# arrives as an exit code with no explanation, which is the one outcome the exit
# codes in main.py exist to prevent.
ENV PYTHONUNBUFFERED=1

# No CMD arguments beyond the module: the scope and the date default correctly for
# the scheduled run, and Cloud Run Jobs can append `--dry-run` or `--scope Bonds`
# as container args for a one-off without a rebuild.
ENTRYPOINT ["python", "-m", "radar_flows.main"]
