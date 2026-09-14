using System.Text.Json.Serialization;
using IdeaTracker.Api.Data;
using IdeaTracker.Api.Repositories;
using IdeaTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------
// Database provider selection
//
// Database__Provider = "Sqlite" (default, zero local setup) or "SqlServer".
// Database__ConnectionString, or the standard ConnectionStrings__DefaultConnection,
// supplies the connection string. Same code path either way — only the
// provider registration differs — so the schema and queries are exercised
// identically in dev and in prod. See SOLUTION.md for why Sqlite+EnsureCreated
// is used locally instead of replaying EF Core migrations, alongside the
// hand-authored sql/schema.sql for the SQL Server / Azure SQL target.
// ---------------------------------------------------------------------
var provider = builder.Configuration["Database:Provider"] ?? "Sqlite";
var connectionString =
    builder.Configuration["Database:ConnectionString"]
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=ideatracker.db";

builder.Services.AddDbContext<IdeaTrackerDbContext>(options =>
{
    if (string.Equals(provider, "SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

builder.Services.AddScoped<IIdeaRepository, IdeaRepository>();
builder.Services.AddScoped<IIdeaService, IdeaService>();
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Lets clients send/receive status as "Approved" instead of an integer.
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Idea Tracker API", Version = "v1" });
});

// Dev-only CORS so the Vite dev server (default http://localhost:5173) can
// call this API directly. Configurable via Cors__AllowedOrigins for anyone
// running the frontend on a different port.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.MapControllers();

// Basic health/readiness endpoint (optional per the brief) — useful as an
// App Service health check probe in the Azure path described in SOLUTION.md.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", utc = DateTimeOffset.UtcNow }));

// Dev convenience: create the schema and seed a few ideas on startup so the
// UI has something to show immediately. Never touches the SQL Server path —
// production schema changes go through sql/schema.sql instead (see SOLUTION.md).
if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<IdeaTrackerDbContext>();
    db.Database.EnsureCreated();
    SeedData.EnsureSeeded(db);
}

app.Run();

// Exposed for WebApplicationFactory-based integration tests.
public partial class Program { }
