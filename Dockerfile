# See : https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
FROM node:24-slim

# Uncomment if you need to configure proxy.
# You can init these variables by using --build-args during docker build
# Example : docker build [...] --build-args http_proxy=http://<user>:<password>@<host>:<port>
#ENV HTTP_PROXY=$http_proxy
#ENV HTTPS_PROXY=$https_proxy
#ENV NO_PROXY=$no_proxy

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libx11-xcb1 libnss3-tools curl \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .

# Uncomment if you need to configure proxy.
#RUN npm config set proxy $HTTP_PROXY

RUN npm i \
    && npm link \
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app/

USER pptruser

# To avoid "Error: ENOENT: no such file or directory, open '/app/dist/greenItBundle.js'"
RUN npm i \
    && node node_modules/puppeteer/install.mjs

ENV URL_PATH="/app/input/url.yaml"
ENV RESULTS_PATH="/app/output/results.html"
CMD greenit analyse $URL_PATH $RESULTS_PATH
