# 45Group

---

## Project Setup

### Install Dependencies

After cloning the repository, install the dependencies using:

```bash
yarn install
```

Ensure that Yarn is installed before running this command. If Yarn is not installed and you prefer using another package manager like npm or pnpm, follow these steps:

1. Delete the `yarn.lock` file.
2. Run the installation command for your chosen package manager, such as `npm install` or `pnpm install`.

### Environment Variables

Before starting the project, ensure you have all the required environment variables. Use the `.env.example` file as a guide to set up the necessary values in your `.env` file.

### Development

To start the project in development mode, run:

```bash
yarn dev
```

### Production

To run the project in production mode:

1. Build the project:

   ```bash
   yarn build
   ```

2. Start the production server:

   ```bash
   yarn start
   ```

### Code Formatting

To format all files using Prettier, run:

```bash
yarn format
```

### Linting

To lint all files using ESLint, run:

```bash
yarn lint
```

### Database

#### Migrations

To migrate the database, run:

```bash
yarn migrate
```

**Note:** The project uses PostgreSQL as the database.

#### Generate Migrations

To create migrations from your Drizzle schema, run:

```bash
yarn generate
```

#### Drizzle Studio

To run Drizzle Studio, execute:

```bash
yarn drizzle-studio
```
