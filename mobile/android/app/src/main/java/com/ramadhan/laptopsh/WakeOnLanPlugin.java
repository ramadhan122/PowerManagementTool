package com.ramadhan.laptopsh;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

@CapacitorPlugin(name = "WakeOnLan")
public class WakeOnLanPlugin extends Plugin {

    @PluginMethod
    public void send(PluginCall call) {
        String macAddress = call.getString("macAddress", "50-EB-71-2B-62-B8");
        String broadcastAddress = call.getString("broadcastAddress", "192.168.0.255");
        int port = call.getInt("port", 9);

        new Thread(() -> {
            try {
                String cleanMac = macAddress.replace(":", "")
                                           .replace("-", "")
                                           .replace(".", "");

                if (!cleanMac.matches("(?i)[0-9a-f]{12}")) {
                    call.reject("Format MAC address tidak valid.");
                    return;
                }

                if (port < 1 || port > 65535) {
                    call.reject("Port UDP tidak valid.");
                    return;
                }

                byte[] macBytes = new byte[6];

                for (int i = 0; i < 6; i++) {
                    macBytes[i] = (byte) Integer.parseInt(
                        cleanMac.substring(i * 2, i * 2 + 2), 16
                    );
                }

                byte[] packet = new byte[102];

                for (int i = 0; i < 6; i++) {
                    packet[i] = (byte) 0xFF;
                }

                for (int i = 0; i < 16; i++) {
                    System.arraycopy(macBytes, 0, packet, 6 + (i * 6), 6);
                }

                InetAddress address = InetAddress.getByName(broadcastAddress);

                try (DatagramSocket socket = new DatagramSocket()) {
                    socket.setBroadcast(true);

                    DatagramPacket magicPacket = new DatagramPacket(
                        packet,
                        packet.length,
                        address,
                        port
                    );

                    socket.send(magicPacket);
                }

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Magic Packet berhasil dikirim.");
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Gagal mengirim Magic Packet: " + e.getMessage());
            }
        }).start();
    }
}
