#!/usr/bin/env node
import Table from "cli-table3";
import got from "got";
import ora from "ora";
import { program } from "commander";
import terminalImage from "terminal-image";
import he from "he";
import chalk from "chalk";

program
  .option("-s, --search <name>", "search movies by name")
  .option("-i, --id <id>", "search movie by id");

program.parse();

const options = program.opts();
if (options.search) listMovies(options.search);
else if (options.id) listMovieDetails(options.id);

async function listMovieDetails(id) {
  const url = `https://search.imdbot.workers.dev/?tt=${id}`;
  const movie = await fetchData(url);
  const table = new Table({
    colWidths: [10, 40],
    style: { border: [], head: [] },
    wordWrap: true,
  });
  const {
    name,
    image,
    description,
    review: { reviewBody },
    aggregateRating: { ratingValue },
    genre,
    datePublished,
    actor,
    director,
    duration,
  } = movie.short;
  const body = await got(image).buffer();
  let posterImage = await terminalImage.buffer(body, {
    width: 49,
    height: 30,
    preserveAspectRatio: false,
  });

  table.push(
    [{ content: posterImage, colSpan: 2 }],
    [chalk.white.bold("Name"), name],
    [chalk.white.bold("Rating"), `${ratingValue}/10`],
    [chalk.white.bold("Story"), he.decode(description)],
    [chalk.white.bold("Released"), datePublished],
    [chalk.white.bold("Genre"), [genre].join(",")],
    [chalk.white.bold("Duration"), duration ? duration.slice(2) : "No info available"],
    [chalk.white.bold("Review"), he.decode(reviewBody)],
    [chalk.white.bold("Actors"), [actor.map((x) => x.name)].join(",")],
    [
      chalk.white.bold("Director"),
      director ? [director.map((x) => x.name)].join(",") : "No info available",
    ]
  );
  console.log(table.toString());
}

async function listMovies(movie_name, lim = 10) {
  const table = new Table({
    head: ["ID", "TITLE", "YEAR", "ACTORS", "IMDB LINK", "POSTER"],
    colWidths: [12, 20, 10, 20, 7, 25],
    wordWrap: true,
    style: {
      head: ["rgb(0, 191, 255)"],
    },
  });
  const url = `https://search.imdbot.workers.dev/?q=${movie_name}`;

  const data = await fetchData(url);
  let movies = [];
  if(data){
    movies = data.description;
  }
  const moviesWithPoster = movies.filter((movie) => movie["#IMG_POSTER"]);

  const topMovies = moviesWithPoster.slice(0, lim);

  const spinner = ora("Preparing data...").start();
  try {
    const promises = topMovies.map(
      async ({
        "#IMDB_ID": id,
        "#TITLE": title,
        "#YEAR": year,
        "#ACTORS": actors,
        "#IMDB_URL": imdb,
        "#IMG_POSTER": poster,
      }) => {
        let posterImage;
        const body = await got(poster).buffer();
        posterImage = await terminalImage.buffer(body, {
          width: 23,
          height: 15,
          preserveAspectRatio: false,
        });
        return { id, title, year, actors, imdb, poster: posterImage };
      }
    );

    const moviesWithPosters = await Promise.all(promises);
    moviesWithPosters.forEach(({ id, title, year, actors, imdb, poster }) => {
      const href = imdb;

      table.push([
        {
          content: chalk.greenBright.bold(id),
          hAlign: "center",
          vAlign: "center",
        },
        {
          content: chalk.magentaBright.bold(title),
          hAlign: "center",
          vAlign: "center",
        },
        {
          content: chalk.yellowBright.bold(year),
          hAlign: "center",
          vAlign: "center",
        },
        {
          content: chalk.white.bold(actors),
          hAlign: "center",
          vAlign: "center",
        },
        {
          content: chalk.blueBright("IMDB"),
          href,
          hAlign: "center",
          vAlign: "center",
        },
        poster,
      ]);
    });
    spinner.stop();
    console.log(table.toString());
    process.exit();
  } catch (error) {
    console.log("On no!! Wait a minuite...");
    listMovies(movie_name, Math.ceil(lim / 2));
  }
}

async function fetchData(url) {
  const spinner = ora("Fetching data").start();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    spinner.stop();
    return data;
  } catch (error) {
    spinner.stop();
    console.error("There was a problem while fetching data");
  }
}
