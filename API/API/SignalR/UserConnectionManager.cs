using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.SignalR
{
    public static class UserConnectionManager
    {
        private static readonly Dictionary<string, HashSet<string>> _connections = new();

        public static int AddConnection(string userId, string connectionId)
        {
            lock (_connections)
            {
                if (!_connections.ContainsKey(userId))
                    _connections[userId] = new HashSet<string>();

                _connections[userId].Add(connectionId);
                return _connections[userId].Count;
            }
        }

        public static int RemoveConnection(string userId, string connectionId)
        {
            lock (_connections)
            {
                if (!_connections.ContainsKey(userId))
                    return 0;

                _connections[userId].Remove(connectionId);
                if (_connections[userId].Count == 0)
                    _connections.Remove(userId);

                return _connections.ContainsKey(userId)
                    ? _connections[userId].Count
                    : 0;
            }
        }
    }

}
