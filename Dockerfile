# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
# Using legacy-peer-deps and increased network timeout
RUN npm install --legacy-peer-deps
COPY . .
# Run build with debug logs to catch any remaining issues
RUN npm run build -- --logLevel info

# Stage 2: Build Backend
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app
COPY backend-spring /app/backend-spring
WORKDIR /app/backend-spring
RUN mkdir -p src/main/resources/static
COPY --from=frontend-build /app/dist/ src/main/resources/static/
RUN MAVEN_OPTS="-Xmx512m" mvn clean package -DskipTests

# Stage 3: Final Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=backend-build /app/backend-spring/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
