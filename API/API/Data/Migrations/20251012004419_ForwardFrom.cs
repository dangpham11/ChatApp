using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class ForwardFrom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ForwardedFromId",
                table: "Messages",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ForwardedFromId",
                table: "Messages",
                column: "ForwardedFromId");

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Users_ForwardedFromId",
                table: "Messages",
                column: "ForwardedFromId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Users_ForwardedFromId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ForwardedFromId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ForwardedFromId",
                table: "Messages");
        }
    }
}
