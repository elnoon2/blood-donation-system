# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
# Using legacy-peer-deps to avoid installation conflicts
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Build Backend
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app
# Copy the entire backend folder first
COPY backend-spring /app/backend-spring
WORKDIR /app/backend-spring
# Ensure static folder exists and copy frontend build
RUN mkdir -p src/main/resources/static
COPY --from=frontend-build /app/dist/ src/main/resources/static/
# Build the JAR with optimized memory
RUN MAVEN_OPTS="-Xmx512m" mvn clean package -DskipTests

# Stage 3: Final Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Find the generated jar and name it app.jar
COPY --from=backend-build /app/backend-spring/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
