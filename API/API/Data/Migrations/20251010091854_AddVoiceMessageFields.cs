using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVoiceMessageFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "VoiceDuration",
                table: "Messages",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoiceUrl",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VoiceDuration",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "VoiceUrl",
                table: "Messages");
        }
    }
}
