# Artifacta Server - Backend API

![Artifacta Server Banner](https://example.com/path-to-your-server-banner.jpg)

This is the backend server for Artifacta, a historical artifacts tracking application. The server provides RESTful API endpoints for managing artifact data, user interactions, and authentication.



## Features

- **CRUD Operations**: Full Create, Read, Update, Delete functionality for artifacts
- **Like System**: Track user likes and maintain like counts
- **Search Functionality**: Search artifacts by name, type, or description
- **User-Specific Data**: Retrieve artifacts added or liked by specific users
- **MongoDB Integration**: Secure connection to MongoDB database
- **CORS Support**: Configured for cross-origin requests
- **Error Handling**: Comprehensive error handling for all endpoints

## Technologies Used

- Node.js
- Express.js
- MongoDB (with official Node.js driver)
- CORS middleware
- Dotenv for environment variables

## API Endpoints

### Artifacts
- `GET /artifacts` - Get all artifacts
- `GET /artifacts/:id` - Get single artifact by ID
- `POST /artifacts` - Add new artifact
- `PUT /artifacts/:id` - Update existing artifact
- `DELETE /artifacts/:id` - Delete artifact

### User-Specific Data
- `GET /artifacts/myCollection/:email` - Get artifacts added by a user
- `GET /artifacts/likedBy/:email` - Get artifacts liked by a user

### Interactions
- `PATCH /like/:id` - Toggle like on an artifact
- `GET /search-artifacts?q=query` - Search artifacts by query

## Installation

To run this server locally:

1. Clone the repository:
```bash
git clone https://github.com/Programming-Hero-Web-Course4/b11a11-server-side-TaFhiM12.git
cd artifacta-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your configuration:
```env
PORT=3000
DB_URI=mongodb+srv://yourusername:yourpassword@cluster0.mongodb.net/artifactaDB?retryWrites=true&w=majority
```

4. Start the server:
```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port number for the server | No (default: 3000) |
| `DB_URI` | MongoDB connection URI | Yes |

## Database Schema

The main artifacts collection has the following structure:

```javascript
{
  _id: ObjectId,
  name: String,
  imageUrl: String,
  type: String,
  historicalContext: String,
  shortDescription: String,
  createdAt: String, // e.g., "100 BC"
  discoveredAt: String, // e.g., "1799"
  discoveredBy: String,
  presentLocation: String,
  addedBy: {
    name: String,
    email: String
  },
  likeCount: Number,
  likedBy: [String], // Array of user emails
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` OK - Successful request
- `400` Bad Request - Invalid input or missing parameters
- `404` Not Found - Resource not found
- `500` Internal Server Error - Server error

Error responses include a JSON object with an `error` field containing details.

## Deployment

The server is deployed on Vercel with the following configuration:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

## Contributing

Contributions are welcome! Please ensure all pull requests include:

1. Clear description of changes
2. Appropriate tests if adding new features
3. Documentation updates if changing API behavior

## License

This project is licensed under the MIT License.

## Contact

For server-related issues or questions, contact [tafhim000001@gmail.com](mailto:tafhim000001@gmail.com).