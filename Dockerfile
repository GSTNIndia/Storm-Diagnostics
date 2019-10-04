FROM openjdk:8-alpine

COPY target/uberjar/teacup.jar /teacup/app.jar

EXPOSE 8080

CMD ["java", "-jar", "/teacup/app.jar"]
