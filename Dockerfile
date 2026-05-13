# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend
FROM maven:3.8.5-openjdk-17-slim AS backend-build
WORKDIR /app
# Copy the pom.xml first to leverage Docker cache
COPY backend-spring/pom.xml ./
RUN mvn dependency:go-offline
# Copy the rest of the backend source
COPY backend-spring/src ./src
# Copy the frontend build into Spring Boot's static folder
RUN mkdir -p src/main/resources/static
COPY --from=frontend-build /app/dist/ ./src/main/resources/static/
# Build the JAR
RUN mvn clean package -DskipTests

# Stage 3: Final Runtime
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
# Railway will provide the PORT env var, Spring Boot picks it up via server.port=${PORT:8080}
ENTRYPOINT ["java", "-jar", "app.jar"]
