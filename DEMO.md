# Demo

## 1. Npm

1. Install
```
npm i
```

2. Link
```
npm link
```

3. Analyse - HTML
```
greenit analyse samples/greenit-url.yml output/greenit.html --max_tab=1 --timeout=10000 --retry=3
```

## 2. Docker build

1. Build
```
docker build -t greenit-analysis-cli .
```

2. Run
```
docker run -it --init --rm --cap-add=SYS_ADMIN  \
    -v output:/app/output \
    -e TZ=Europe/Paris \
    --name greenit-analysis-cli-container \
    greenit-analysis-cli \
    greenit analyse samples/greenit-url.yml output/greenit.html \
    --max_tab=1 \
    --timeout=10000 \
    --retry=3
```

## 3. Docker pull

1. Pull image
```
docker pull jpreisner/greenit-analysis-cli:latest
```

2. Run container
```
docker run -it --init --rm --cap-add=SYS_ADMIN  \
    -v output:/app/output \
    -e TZ=Europe/Paris \
    --name greenit-analysis-cli-container \
    jpreisner/greenit-analysis-cli \
    greenit analyse samples/greenit-url.yml output/greenit.html \
    --max_tab=1 \
    --timeout=10000 \
    --retry=3
```
