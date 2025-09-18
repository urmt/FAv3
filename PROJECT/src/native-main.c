#include <gtk/gtk.h>
#include <libportal/portal.h>

int main(int argc, char *argv[]) {
    gtk_init();
    
    GtkApplication *app = gtk_application_new("com.urmt.FedoraAssistant", G_APPLICATION_FLAGS_NONE);
    g_signal_connect(app, "activate", G_CALLBACK(on_activate), NULL);
    
    int status = g_application_run(G_APPLICATION(app), argc, argv);
    g_object_unref(app);
    
    return status;
}

static void on_activate(GtkApplication *app) {
    // Initialize main window
    GtkWidget *window = gtk_application_window_new(app);
    gtk_window_set_title(GTK_WINDOW(window), "Fedora Assistant AI");
    gtk_window_set_default_size(GTK_WINDOW(window), 1200, 800);
    
    // Create WebKitGTK webview
    WebKitWebView *webview = WEBKIT_WEB_VIEW(webkit_web_view_new());
    gtk_container_add(GTK_CONTAINER(window), GTK_WIDGET(webview));
    
    // Load local HTML/JS bundle
    webkit_web_view_load_uri(webview, "file:///usr/share/FedoraAssistant/index.html");
    
    gtk_widget_show_all(window);
}
