-- Idea Tracker — SQL Server schema
--
-- Matches the EF Core model in src/IdeaTracker.Api/Data/IdeaTrackerDbContext.cs.
-- Run this against SQL Server / Azure SQL for the production path; local
-- development instead uses the Sqlite provider with EF Core's
-- Database.EnsureCreated() (see Program.cs and SOLUTION.md for why).
--
-- Usage:
--   sqlcmd -S <server> -d <database> -i sql/schema.sql

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Ideas')
BEGIN
    CREATE TABLE dbo.Ideas
    (
        Id          UNIQUEIDENTIFIER   NOT NULL CONSTRAINT PK_Ideas PRIMARY KEY DEFAULT NEWID(),
        Title       NVARCHAR(200)      NOT NULL,
        Description NVARCHAR(4000)     NOT NULL CONSTRAINT DF_Ideas_Description DEFAULT (N''),
        Status      NVARCHAR(20)       NOT NULL CONSTRAINT DF_Ideas_Status DEFAULT (N'Proposed'),
        -- UTC always (see Idea.CreatedAt doc comment) — DATETIME2 rather than
        -- DATETIMEOFFSET since we never store a non-UTC offset.
        CreatedAt   DATETIME2(3)       NOT NULL,
        UpdatedAt   DATETIME2(3)       NOT NULL,
        -- Comma-delimited short strings (see Idea.Tags doc comment for the
        -- trade-off) rather than a child table for this slice.
        Tags        NVARCHAR(500)      NOT NULL CONSTRAINT DF_Ideas_Tags DEFAULT (N''),

        CONSTRAINT CK_Ideas_Status CHECK (Status IN (N'Proposed', N'InReview', N'Approved', N'Rejected'))
    );

    CREATE INDEX IX_Ideas_Status ON dbo.Ideas (Status);
    CREATE INDEX IX_Ideas_CreatedAt ON dbo.Ideas (CreatedAt DESC);
END
GO
